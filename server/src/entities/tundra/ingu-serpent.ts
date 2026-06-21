import { HitboxTag, createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { getTamingSkill, TamingSkillID } from "../../../../shared/dist/taming.js";
import { TileType } from "../../../../shared/dist/tiles.js";
import { angle, polarVec2, Point, getAbsAngleDiff, rotatePoint } from "../../../../shared/dist/utils.js";
import WanderAI from "../../ai/WanderAI.js";
import { EntityConfig, LightCreationInfo } from "../../components.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { InguSerpentComponent } from "../../components/InguSerpentComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { TamingComponent } from "../../components/TamingComponent.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent.js";
import { applyAccelerationFromGround, createHitbox, getHitboxTag, Hitbox, setHitboxTag, turnHitboxToAngle } from "../../hitboxes.js";
import Layer from "../../Layer.js";
import { createLight } from "../../lights.js";
import { registerEntityTamingSpec } from "../../taming-specs.js";
import { addHitboxAngularTether, tetherHitboxes } from "../../tethers.js";
import { getEntityAgeTicks } from "../../world.js";

registerEntityLootOnDeath(EntityType.inguSerpent, {
   itemType: ItemType.inguSerpentTooth,
   getAmount: () => 2,
   hitboxIdx: 0
});

registerEntityTamingSpec(EntityType.inguSerpent, {
   maxTamingTier: 3,
   skillNodes: [
      {
         skill: getTamingSkill(TamingSkillID.follow),
         x: 0,
         y: 10,
         parent: null,
         requiredTamingTier: 1
      },
      {
         skill: getTamingSkill(TamingSkillID.move),
         x: 0,
         y: 30,
         parent: TamingSkillID.follow,
         requiredTamingTier: 2
      },
      {
         skill: getTamingSkill(TamingSkillID.attack),
         x: 0,
         y: 50,
         parent: TamingSkillID.move,
         requiredTamingTier: 3
      }
   ],
   foodItemType: ItemType.rawSnobeMeat,
   tierFoodRequirements: {
      0: 0,
      1: 5,
      2: 15,
      3: 40
   }
});

const moveFunc = (serpent: Entity, x: number, y: number, accelerationMagnitude: number): void => {
   // @HACKKK!!!!
   // const targetEntity = PlayerComponentArray.activeEntities[0];
   // const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // const targetHitbox = targetTransformComponent.hitboxes[0];
   
   const transformComponent = TransformComponentArray.getComponent(serpent);
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];

      let moveDir: number;
      if (i === 0) {
         moveDir = hitbox.box.angle;
      } else {
         const previousHitbox = transformComponent.hitboxes[i - 1] as Hitbox;
         moveDir = angle(previousHitbox.box.posX - hitbox.box.posX, previousHitbox.box.posY - hitbox.box.posY);
      }
      
      const isHeadHitbox = getHitboxTag(hitbox) === HitboxTag.inguSerpentHead;
      const acc = accelerationMagnitude * (isHeadHitbox ? 1.4 : 0.7) * 0.5;
      const connectingVel = polarVec2(acc, moveDir);

      // const dirToTarget = hitbox.box.position.angleTo(targetHitbox.box.position);
      const dirToTarget = angle(x - hitbox.box.posX, y - hitbox.box.posY);
      const velToTarget = polarVec2(accelerationMagnitude * (isHeadHitbox ? 1.4 : 0.7) * 0.5, dirToTarget);

      applyAccelerationFromGround(hitbox, new Point(connectingVel.x + velToTarget.x, connectingVel.y + velToTarget.y));
   }
}

const turnFunc = (serpent: Entity, x: number, y: number, turnSpeed: number, turnDamping: number): void => {
   // @HACKKK!!!!
   // const targetEntity = PlayerComponentArray.activeEntities[0];
   // const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // const targetHitbox = targetTransformComponent.hitboxes[0];

   // const pos = predictHitboxPos(targetHitbox, 0.3);
   const transformComponent = TransformComponentArray.getComponent(serpent);
   const headHitbox = transformComponent.rootHitboxes[0];

   const targetDirection = angle(x - headHitbox.box.posX, y - headHitbox.box.posY);

   const absDiff = getAbsAngleDiff(headHitbox.box.angle, targetDirection);
   const angleDiffStopWiggle = 0.85;
   const wiggleMultiplier = 1 - Math.pow(Math.min(absDiff, angleDiffStopWiggle) / angleDiffStopWiggle, 2);
   
   // const idealAngle = targetDirection + Math.PI * 0.45 * Math.sin(getEntityAgeTicks(serpent) * Settings.DT_S * 7) * wiggleMultiplier;
   const idealAngle = targetDirection + Math.PI * 0.45 * Math.sin(getEntityAgeTicks(serpent) * Settings.DT_S * 7);
   turnHitboxToAngle(headHitbox, idealAngle, turnSpeed, turnDamping, false);
}

function wanderPositionIsValid(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return layer.getTileTypeAtPosition(x, y) === TileType.permafrost;
}

export function createInguSerpentConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const headHitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 28), 0.9, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(headHitbox, HitboxTag.inguSerpentHead);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   const idealBody1Dist = 48;

   const body1Offset = new Point(0, -idealBody1Dist);
   const rotatedOffset = rotatePoint(body1Offset, angle);
   const body1Hitbox = createHitbox(transformComponent, null, createCircularBox(x + rotatedOffset.x, y + rotatedOffset.y, body1Offset.x, body1Offset.y, angle, 28), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(body1Hitbox, HitboxTag.inguSerpentBody1);
   addHitboxToTransformComponent(transformComponent, body1Hitbox);
   
   tetherHitboxes(body1Hitbox, headHitbox, idealBody1Dist, 100, 1.2);
   addHitboxAngularTether(body1Hitbox, {
      hitbox: body1Hitbox,
      originHitbox: headHitbox,
      idealAngle: Math.PI,
      springConstant: 61,
      damping: 0.85,
      padding: Math.PI * 0.1,
      idealHitboxAngleOffset: Math.PI,
      useLeverage: false
   });

   const idealBody2Dist = 46;

   const body2Offset = new Point(0, -idealBody2Dist);
   const body2OffsetRotated = rotatePoint(body2Offset, angle);
   const body2Hitbox = createHitbox(transformComponent, null, createCircularBox(body1Hitbox.box.posX + body2OffsetRotated.x, body1Hitbox.box.posY + body2OffsetRotated.y, body2Offset.x, body2Offset.y, angle, 28), 0.65, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(body2Hitbox, HitboxTag.inguSerpentBody2);
   addHitboxToTransformComponent(transformComponent, body2Hitbox);

   tetherHitboxes(body2Hitbox, body1Hitbox, idealBody2Dist, 100, 1.2);
   addHitboxAngularTether(body2Hitbox, {
      hitbox: body2Hitbox,
      originHitbox: body1Hitbox,
      idealAngle: Math.PI,
      springConstant: 61,
      damping: 0.85,
      padding: Math.PI * 0.1,
      idealHitboxAngleOffset: Math.PI,
      useLeverage: false
   });

   const idealTailDist = 44;

   const tailOffset = new Point(0, -idealTailDist);
   const tailHitbox = createHitbox(transformComponent, null, createCircularBox(body2Hitbox.box.posX + tailOffset.x, body2Hitbox.box.posY + tailOffset.y, tailOffset.x, tailOffset.y, angle, 28), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(tailHitbox, HitboxTag.inguSerpentTail);
   addHitboxToTransformComponent(transformComponent, tailHitbox);
   
   tetherHitboxes(tailHitbox, body2Hitbox, idealTailDist, 100, 1.2);
   addHitboxAngularTether(tailHitbox, {
      hitbox: tailHitbox,
      originHitbox: body2Hitbox,
      idealAngle: Math.PI,
      springConstant: 61,
      damping: 0.85,
      padding: Math.PI * 0.1,
      idealHitboxAngleOffset: Math.PI,
      useLeverage: false
   });

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.freezing);
   
   const healthComponent = new HealthComponent(35);

   const aiHelperComponent = new AIHelperComponent(headHitbox, 550, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(750, 4.5 * Math.PI, 1.8, 0.35, wanderPositionIsValid);

   const tamingComponent = new TamingComponent();
   
   const lootComponent = new LootComponent();
   
   const inguSerpentComponent = new InguSerpentComponent();

   // @Speed
   const lights: LightCreationInfo[] = [];
   const hitboxes = [headHitbox, body1Hitbox, body2Hitbox, tailHitbox];
   for (const hitbox of hitboxes) {
      const light = createLight(
         new Point(0, 0),
         0.55,
         0.45,
         2,
         51/255,
         82/255,
         128/255
      );
      lights.push({
         light: light,
         attachedHitbox: hitbox
      });
   }
   
   return {
      entityType: EntityType.inguSerpent,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         aiHelperComponent,
         tamingComponent,
         lootComponent,
         inguSerpentComponent,
      ],
      lights: lights
   }
}