import WanderAI from "../../ai/WanderAI.js";
import { EntityConfig, LightCreationInfo } from "../../components.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { FollowAI } from "../../ai/FollowAI.js";
import { GlurbHeadSegmentComponent } from "../../components/GlurbHeadSegmentComponent.js";
import { GlurbSegmentComponent } from "../../components/GlurbSegmentComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent.js";
import { applyAccelerationFromGround, createHitbox, Hitbox, turnHitboxToAngle } from "../../hitboxes.js";
import Layer from "../../Layer.js";
import { createLight } from "../../lights.js";
import { getEntityAgeTicks } from "../../world.js";
import { registerEntityTamingSpec } from "../../taming-specs.js";
import { TamingComponent } from "../../components/TamingComponent.js";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { getHitboxTethers } from "../../tethers.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { getTamingSkill, TamingSkillID } from "../../../../shared/dist/taming.js";
import { lerp, angle, polarVec2, Point } from "../../../../shared/dist/utils.js";

const enum Vars {
   MIN_FOLLOW_COOLDOWN = 10 * Settings.TICK_RATE,
   MAX_FOLLOW_COOLDOWN = 20 * Settings.TICK_RATE
}

registerEntityTamingSpec(EntityType.glurbHeadSegment, {
   maxTamingTier: 1,
   skillNodes: [
      {
         skill: getTamingSkill(TamingSkillID.follow),
         x: -13,
         y: 10,
         parent: null,
         requiredTamingTier: 1
      },
      {
         skill: getTamingSkill(TamingSkillID.dulledPainReceptors),
         x: 13,
         y: 10,
         parent: null,
         requiredTamingTier: 1
      }
   ],
   foodItemType: ItemType.berry,
   tierFoodRequirements: {
      0: 0,
      1: 5
   }
});

registerEntityLootOnDeath(EntityType.glurbHeadSegment, {
   itemType: ItemType.slurb,
   getAmount: () => 1
});

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return true;
}

const getAcceleration = (glurb: Entity): number => {
   const age = getEntityAgeTicks(glurb);
   
   const u = (Math.sin(age * Settings.DT_S * 6.5) + 1) * 0.5;
   return lerp(375, 650, u);
}

const propagateMoveDirective = (glurbSegment: Entity, furtherHitbox: Hitbox | null, x: number, y: number, foundSegments: Entity[]): void => {
   const transformComponent = TransformComponentArray.getComponent(glurbSegment);
   const hitbox = transformComponent.hitboxes[0];

   const acceleration = getAcceleration(glurbSegment);
   
   let targetDir: number;
   if (furtherHitbox === null) {
      targetDir = angle(x - hitbox.box.posX, y - hitbox.box.posY);
   } else {
      targetDir = angle(furtherHitbox.box.posX - hitbox.box.posX, furtherHitbox.box.posY - hitbox.box.posY);
   }
   
   applyAccelerationFromGround(hitbox, polarVec2(acceleration, targetDir));
   
   // Propagate
   const tethers = getHitboxTethers(hitbox);
   if (tethers !== undefined) {
      for (const tether of tethers) {
         const otherHitbox = tether.getOtherHitbox(hitbox);
         if (!foundSegments.includes(otherHitbox.entity)) {
            foundSegments.push(otherHitbox.entity);
            propagateMoveDirective(otherHitbox.entity, hitbox, x, y, foundSegments);
         }
      }
   }
}

const moveFunc = (head: Entity, x: number, y: number): void => {
   propagateMoveDirective(head, null, x, y, []);
}

const turnFunc = (head: Entity, x: number, y: number, turnSpeed: number, turnDamping: number): void => {
   const transformComponent = TransformComponentArray.getComponent(head);
   const hitbox = transformComponent.hitboxes[0];
   
   const targetDirection = angle(x - hitbox.box.posX, y - hitbox.box.posY);

   turnHitboxToAngle(hitbox, targetDirection, Math.PI, 0.5, false);
}

export function createGlurbHeadSegmentConfig(x: number, y: number, rotation: number, maxNumSegments: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, rotation, 24), 0.6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);
   
   const aiHelperComponent = new AIHelperComponent(hitbox, 350, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, 2 * Math.PI, 0.5, 0.25, positionIsValidCallback);
   aiHelperComponent.ais[AIType.follow] = new FollowAI(Vars.MIN_FOLLOW_COOLDOWN, Vars.MAX_FOLLOW_COOLDOWN, 0.2, 35);
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(Settings.TICK_RATE * 6);

   const lootComponent = new LootComponent();

   const tamingComponent = new TamingComponent();
   
   const glurbSegmentComponent = new GlurbSegmentComponent();
   
   const glurbHeadSegmentComponent = new GlurbHeadSegmentComponent(maxNumSegments);

   const light = createLight(new Point(0, 0), 0.35, 0.8, 6, 1, 0.2, 0.9);
   const lights: LightCreationInfo[] = [{
      light: light,
      attachedHitbox: hitbox
   }];

   return {
      entityType: EntityType.glurbHeadSegment,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         attackingEntitiesComponent,
         lootComponent,
         tamingComponent,
         glurbSegmentComponent,
         glurbHeadSegmentComponent,
      ],
      lights: lights
   };
}