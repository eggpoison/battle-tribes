import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { distance, Point, randAngle, randInt } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { GolemComponent } from "../../components/GolemComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig, LightCreationInfo } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { Hitbox } from "../../hitboxes";
import { createLight } from "../../lights";

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

const hitboxIsTooClose = (existingHitboxes: ReadonlyArray<Hitbox>, hitboxX: number, hitboxY: number): boolean => {
   for (let j = 0; j < existingHitboxes.length; j++) {
      const otherHitbox = existingHitboxes[j];
      const otherBox = otherHitbox.box;

      const dist = distance(hitboxX, hitboxY, otherBox.offset.x, otherBox.offset.y);
      if (dist <= (otherBox as CircularBox).radius + 1) {
         return true;
      }
   }

   return false;
}

const getMinSeparationFromOtherHitboxes = (hitboxes: ReadonlyArray<Hitbox>, hitboxX: number, hitboxY: number, hitboxRadius: number): number => {
   let minSeparation = 999.9;
   for (let i = 0; i < hitboxes.length; i++) {
      const otherHitbox = hitboxes[i].box as CircularBox;

      const dist = distance(hitboxX, hitboxY, otherHitbox.offset.x, otherHitbox.offset.y);
      const separation = dist - otherHitbox.radius - hitboxRadius;
      if (separation < minSeparation) {
         minSeparation = separation;
      }
   }
   return minSeparation;
}

export function createGolemConfig(position: Point, rotation: number): EntityConfig {
   const lights = new Array<LightCreationInfo>();
   
   const transformComponent = new TransformComponent();
   
   // Create core hitbox
   const coreHitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 36), ROCK_MASSIVE_MASS, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, coreHitbox);

   // Create head hitbox
   const headHitbox = new Hitbox(transformComponent, coreHitbox, true, new CircularBox(new Point(0, 0), new Point(0, 45), 0, 32), ROCK_LARGE_MASS, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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
      const hitbox = new Hitbox(transformComponent, coreHitbox, true, new CircularBox(new Point(0, 0), new Point(x, y), 0, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, hitbox);

      i++;
   }

   // Create hand hitboxes
   for (let j = 0; j < 2; j++) {
      const offsetX = 60 * (j === 0 ? -1 : 1);
      const hitbox = new Hitbox(transformComponent, coreHitbox, true, new CircularBox(new Point(0, 0), new Point(offsetX, 50), 0, 20), ROCK_MEDIUM_MASS, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, hitbox);

      // Wrist
      const inFactor = 0.75;
      const wristHitbox = new Hitbox(transformComponent, coreHitbox, true, new CircularBox(new Point(0, 0), new Point(offsetX * inFactor, 50 * inFactor), 0, 12), ROCK_TINY_MASS, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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