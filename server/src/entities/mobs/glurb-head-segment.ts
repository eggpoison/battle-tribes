import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { lerp, Point, polarVec2 } from "../../../../shared/src/utils";
import WanderAI from "../../ai/WanderAI";
import { EntityConfig, LightCreationInfo } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { FollowAI } from "../../ai/FollowAI";
import { GlurbHeadSegmentComponent, GlurbHeadSegmentComponentArray } from "../../components/GlurbHeadSegmentComponent";
import { GlurbSegmentComponent } from "../../components/GlurbSegmentComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle } from "../../hitboxes";
import Layer from "../../Layer";
import { createLight } from "../../lights";
import { getEntityAgeTicks } from "../../world";
import { getTamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { registerEntityTamingSpec } from "../../taming-specs";
import { TamingComponent } from "../../components/TamingComponent";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StatusEffect } from "../../../../shared/src/status-effects";

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

const propagateMoveDirective = (glurbSegment: Entity, furtherHitbox: Hitbox | null, pos: Point, foundSegments: Array<Entity>): void => {
   const transformComponent = TransformComponentArray.getComponent(glurbSegment);
   const hitbox = transformComponent.hitboxes[0];

   const acceleration = getAcceleration(glurbSegment);
   
   let targetDir: number;
   if (furtherHitbox === null) {
      targetDir = hitbox.box.position.angleTo(pos);
   } else {
      targetDir = hitbox.box.position.angleTo(furtherHitbox.box.position);
   }
   
   applyAccelerationFromGround(hitbox, polarVec2(acceleration, targetDir));
   
   // Propagate
   for (const tether of hitbox.tethers) {
      const otherHitbox = tether.getOtherHitbox(hitbox);
      if (!foundSegments.includes(otherHitbox.entity)) {
         foundSegments.push(otherHitbox.entity);
         propagateMoveDirective(otherHitbox.entity, hitbox, pos, foundSegments);
      }
   }
}

const moveFunc = (head: Entity, pos: Point): void => {
   propagateMoveDirective(head, null, pos, []);
}

const turnFunc = (head: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   const transformComponent = TransformComponentArray.getComponent(head);
   const hitbox = transformComponent.hitboxes[0];
   
   const targetDirection = hitbox.box.position.angleTo(pos);

   turnHitboxToAngle(hitbox, targetDirection, Math.PI, 0.5, false);
}

export function createGlurbHeadSegmentConfig(position: Point, rotation: number, maxNumSegments: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 24), 0.6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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
   const lights: Array<LightCreationInfo> = [{
      light: light,
      attachedHitbox: hitbox
   }];

   return {
      entityType: EntityType.glurbHeadSegment,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.taming]: tamingComponent,
         [ServerComponentType.glurbSegment]: glurbSegmentComponent,
         [ServerComponentType.glurbHeadSegment]: glurbHeadSegmentComponent,
      },
      lights: lights
   };
}