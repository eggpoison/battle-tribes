import { HealthComponent } from "../../components/HealthComponent.js";
import { GolemComponent } from "../../components/GolemComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { EntityConfig, LightCreationInfo } from "../../components.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { createHitbox, Hitbox } from "../../hitboxes.js";
import { createLight } from "../../lights.js";
import { CircularBox, createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { randInt, distance, Point, randAngle } from "../../../../shared/dist/utils.js";

export const enum GolemVars {
   PEBBLUM_SUMMON_COOLDOWN_TICKS = 10 * Settings.TICK_RATE
}

// @Cleanup: shouldn't be polluting the exports!
export const BODY_GENERATION_RADIUS = 55;

const ROCK_TINY_MASS = 0.5;
const ROCK_SMALL_MASS = 0.75;
const ROCK_MEDIUM_MASS = 1.15;
const ROCK_LARGE_MASS = 1.75;
const ROCK_MASSIVE_MASS = 2.25;

export const GOLEM_WAKE_TIME_TICKS = Math.floor(2.5 * Settings.TICK_RATE);

registerEntityLootOnDeath(EntityType.golem, {
   itemType: ItemType.living_rock,
   getAmount: () => randInt(10, 20)
});

const hitboxIsTooClose = (existingHitboxes: readonly Hitbox[], hitboxX: number, hitboxY: number): boolean => {
   for (let j = 0; j < existingHitboxes.length; j++) {
      const otherHitbox = existingHitboxes[j];
      const otherBox = otherHitbox.box;

      const dist = distance(hitboxX, hitboxY, otherBox.offsetX, otherBox.offsetY);
      if (dist <= (otherBox as CircularBox).radius + 1) {
         return true;
      }
   }

   return false;
}

const getMinSeparationFromOtherHitboxes = (hitboxes: readonly Hitbox[], hitboxX: number, hitboxY: number, hitboxRadius: number): number => {
   let minSeparation = 999.9;
   for (let i = 0; i < hitboxes.length; i++) {
      const otherHitbox = hitboxes[i].box as CircularBox;

      const dist = distance(hitboxX, hitboxY, otherHitbox.offsetX, otherHitbox.offsetY);
      const separation = dist - otherHitbox.radius - hitboxRadius;
      if (separation < minSeparation) {
         minSeparation = separation;
      }
   }
   return minSeparation;
}

export function createGolemConfig(x: number, y: number, rotation: number): EntityConfig {
   const lights: LightCreationInfo[] = [];
   
   const transformComponent = new TransformComponent();
   
   // Create core hitbox
   const coreHitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, rotation, 36), ROCK_MASSIVE_MASS, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, coreHitbox);

   // Create head hitbox
   const headHitbox = createHitbox(transformComponent, coreHitbox, createCircularBox(0, 0, 0, 45, 0, 32), ROCK_LARGE_MASS, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, headHitbox);
   
   // Lights on the head hitboxes' eyes
   for (let i = 0; i < 2; i++) {
      // @HACK: i've copy pasted the offsets from the eye render parts in the client
      const offsetX = 20 * (i === 0 ? -1 : 1);
      const offsetY = 17;

      // Create eye light
      const light = createLight(new Point(offsetX, offsetY), 0, 0.5, 0.15, 0.75, 0, 0);
      const lightCreationInfo: LightCreationInfo = {
         light: light,
         attachedHitbox: headHitbox
      };
      lights.push(lightCreationInfo);
   }
   
   // Create body hitboxes
   let i = 0;
   let attempts = 0;
   while (i < 8 && ++attempts < 100) {
      const offsetMagnitude = BODY_GENERATION_RADIUS * Math.random();
      const offsetDirection = randAngle();
      const x = offsetMagnitude * Math.sin(offsetDirection);
      const y = offsetMagnitude * Math.cos(offsetDirection);

      const size = Math.random() < 0.4 ? 0 : 1;
      const radius = size === 0 ? 20 : 26;

      // Make sure the hitboxes aren't too close
      if (hitboxIsTooClose(transformComponent.hitboxes, x, y)) {
         continue;
      }

      // Make sure the hitbox touches another one at least a small amount
      const minSeparation = getMinSeparationFromOtherHitboxes(transformComponent.hitboxes, x, y, radius);
      if (minSeparation > -6) {
         continue;
      }

      const mass = size === 0 ? ROCK_SMALL_MASS : ROCK_MEDIUM_MASS;
      const hitbox = createHitbox(transformComponent, coreHitbox, createCircularBox(0, 0, x, y, 0, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      addHitboxToTransformComponent(transformComponent, hitbox);

      i++;
   }

   // Create hand hitboxes
   for (let j = 0; j < 2; j++) {
      const offsetX = 60 * (j === 0 ? -1 : 1);
      const hitbox = createHitbox(transformComponent, coreHitbox, createCircularBox(0, 0, offsetX, 50, 0, 20), ROCK_MEDIUM_MASS, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      addHitboxToTransformComponent(transformComponent, hitbox);

      // Wrist
      const inFactor = 0.75;
      const wristHitbox = createHitbox(transformComponent, coreHitbox, createCircularBox(0, 0, offsetX * inFactor, 50 * inFactor, 0, 12), ROCK_TINY_MASS, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      addHitboxToTransformComponent(transformComponent, wristHitbox);
   }
   
   const healthComponent = new HealthComponent(150);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned);
   
   const golemComponent = new GolemComponent(transformComponent.hitboxes, GolemVars.PEBBLUM_SUMMON_COOLDOWN_TICKS);

   return {
      entityType: EntityType.golem,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         golemComponent
      ],
      lights: lights
   };
}