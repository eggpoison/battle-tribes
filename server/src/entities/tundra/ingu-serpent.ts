import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { getTamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { TileType } from "../../../../shared/src/tiles";
import { getAbsAngleDiff, Point, polarVec2, rotatePoint } from "../../../../shared/src/utils";
import WanderAI from "../../ai/WanderAI";
import { EntityConfig, LightCreationInfo } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { InguSerpentComponent } from "../../components/InguSerpentComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TamingComponent } from "../../components/TamingComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle } from "../../hitboxes";
import Layer from "../../Layer";
import { createLight } from "../../lights";
import { registerEntityTamingSpec } from "../../taming-specs";
import { tetherHitboxes } from "../../tethers";
import { getEntityAgeTicks } from "../../world";

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

const moveFunc = (serpent: Entity, pos: Point, accelerationMagnitude: number): void => {
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
                                                                  // Here was the devil
      } else {
         const previousHitbox = transformComponent.hitboxes[i - 1] as Hitbox;
         moveDir = hitbox.box.position.angleTo(previousHitbox.box.position);
      }
      
      const isHeadHitbox = hitbox.flags.includes(HitboxFlag.INGU_SERPENT_HEAD);
      const acc = accelerationMagnitude * (isHeadHitbox ? 1.4 : 0.7) * 0.5;
      const connectingVel = polarVec2(acc, moveDir);

      // const dirToTarget = hitbox.box.position.angleTo(targetHitbox.box.position);
      const dirToTarget = hitbox.box.position.angleTo(pos);
      const velToTarget = polarVec2(accelerationMagnitude * (isHeadHitbox ? 1.4 : 0.7) * 0.5, dirToTarget);

      applyAccelerationFromGround(hitbox, new Point(connectingVel.x + velToTarget.x, connectingVel.y + velToTarget.y));
   }
}

const turnFunc = (serpent: Entity, _pos: Point, turnSpeed: number, turnDamping: number): void => {
   // @HACKKK!!!!
   // const targetEntity = PlayerComponentArray.activeEntities[0];
   // const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // const targetHitbox = targetTransformComponent.hitboxes[0];

   // const pos = predictHitboxPos(targetHitbox, 0.3);
   const pos = _pos;

   const transformComponent = TransformComponentArray.getComponent(serpent);
   const headHitbox = transformComponent.rootHitboxes[0];

   const targetDirection = headHitbox.box.position.angleTo(pos);

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

export function createInguSerpentConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const headHitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 28), 0.9, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   const idealBody1Dist = 48;

   const body1Offset = new Point(0, -idealBody1Dist);
   const body1Position = position.copy();
   // @Hack: this rotation operation
   body1Position.add(rotatePoint(body1Offset, angle));
   const body1Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body1Position, body1Offset, angle, 28), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_BODY_1]);
   addHitboxToTransformComponent(transformComponent, body1Hitbox);
   
   tetherHitboxes(body1Hitbox, headHitbox, idealBody1Dist, 100, 1.2);
   // @Hack: method of adding
   body1Hitbox.angularTethers.push({
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
   const body2Position = body1Position.copy();
   // @Hack: this rotation operation
   body2Position.add(rotatePoint(body2Offset, angle));
   const body2Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body2Position, body2Offset, angle, 28), 0.65, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_BODY_2]);
   addHitboxToTransformComponent(transformComponent, body2Hitbox);

   tetherHitboxes(body2Hitbox, body1Hitbox, idealBody2Dist, 100, 1.2);
   // @Hack: method of adding
   body2Hitbox.angularTethers.push({
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
   const tailPosition = body2Position.copy();
   tailPosition.add(tailOffset);
   const tailHitbox = new Hitbox(transformComponent, null, true, new CircularBox(tailPosition, tailOffset, angle, 28), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.INGU_SERPENT_TAIL]);
   addHitboxToTransformComponent(transformComponent, tailHitbox);
   
   tetherHitboxes(tailHitbox, body2Hitbox, idealTailDist, 100, 1.2);
   // @Hack: method of adding
   tailHitbox.angularTethers.push({
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
   const lights = new Array<LightCreationInfo>();
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