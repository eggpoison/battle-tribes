import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { Settings } from "../../../shared/src/settings";
import { Point, polarVec2, randFloat, randInt } from "../../../shared/src/utils";
import { getDistanceFromPointToEntity } from "../ai-shared";
import { createEntityConfigAttachInfo } from "../components";
import { AIHelperComponent, AIType } from "../components/AIHelperComponent";
import { getOkrenMandibleHitbox, OKREN_SIDES, OkrenComponentArray, okrenHitboxesHaveReachedIdealAngles, OkrenSide, OkrenSwingState, restingIdealAngles } from "../components/OkrenComponent";
import { OkrenTongueComponentArray } from "../components/OkrenTongueComponent";
import { TamingComponentArray } from "../components/TamingComponent";
import { TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { TribeMemberComponentArray } from "../components/TribeMemberComponent"
import { createOkrenTongueConfig } from "../entities/desert/okren-tongue";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { createEntity, entityExists, getEntityLayer, getEntityType } from "../world";

export class OkrenCombatAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;
   public readonly turnDamping: number;

   public swingCooldownTicks = 0;

   public readonly okrenMandibleFlickCountdowns = [0, 0];
   public readonly okrenMandibleIsIns = [false, false];

   public tongueCooldownTicks = randInt(MIN_TONGUE_COOLDOWN_TICKS, MAX_TONGUE_COOLDOWN_TICKS);

   constructor(acceleration: number, turnSpeed: number, turnDamping: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
      this.turnDamping = turnDamping;
   }
}

const BOTH_SWING_COOLDOWN_TICKS = Math.floor(Settings.TICK_RATE * 0.7);

const TONGUE_INITIAL_OFFSET = 88;
// @Hack shouldn't export
export const MIN_TONGUE_COOLDOWN_TICKS = 4 * Settings.TICK_RATE;
export const MAX_TONGUE_COOLDOWN_TICKS = 5 * Settings.TICK_RATE;

const entityIsThreatToDesert = (okren: Entity, entity: Entity): boolean => {
   // @Hack
   if (TribeComponentArray.hasComponent(entity)) {
      const entityTribeComponent = TribeComponentArray.getComponent(entity);
      const tamingComponent = TamingComponentArray.getComponent(okren);
      if (entityTribeComponent.tribe === tamingComponent.tameTribe) {
         return false;
      }
   }
   
   return TribeMemberComponentArray.hasComponent(entity) || getEntityType(entity) === EntityType.zombie;
}

const entityIsPrey = (_okren: Entity, entity: Entity): boolean => {
   const entityType = getEntityType(entity);
   return entityType === EntityType.krumblid;
}

const getAttackTarget = (okren: Entity, aiHelperComponent: AIHelperComponent, entityIsTargetted: (okren: Entity, entity: Entity) => boolean): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(okren);
   const hitbox = transformComponent.hitboxes[0];

   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!entityIsTargetted(okren, entity)) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = hitbox.box.position.distanceTo(entityHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

export function getOkrenThreatTarget(okren: Entity, aiHelperComponent: AIHelperComponent): Entity | null {
   return getAttackTarget(okren, aiHelperComponent, entityIsThreatToDesert);
}

export function getOkrenPreyTarget(okren: Entity, aiHelperComponent: AIHelperComponent): Entity | null {
   return getAttackTarget(okren, aiHelperComponent, entityIsPrey);
}

const getTongue = (okrenTransformComponent: TransformComponent): Entity | null => {
   for (const hitbox of okrenTransformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.okrenTongue) {
            return childHitbox.entity;
         }
      }
   }
   return null;
}

const getTonguePosition = (hitbox: Hitbox, offsetMagnitude: number): Point => {
   const offsetDirection = hitbox.box.angle;
   const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
   return new Point(x, y);
}

const deployTongue = (okren: Entity, okrenHitbox: Hitbox, target: Entity): void => {
   const position = getTonguePosition(okrenHitbox, TONGUE_INITIAL_OFFSET);
   
   const tongueConfig = createOkrenTongueConfig(position, okrenHitbox.box.angle, okrenHitbox, target);
   const tongueTipHitbox = tongueConfig.components[ServerComponentType.transform]!.hitboxes[0];
   tongueConfig.attachInfo = createEntityConfigAttachInfo(tongueTipHitbox, okrenHitbox, true);
   createEntity(tongueConfig, getEntityLayer(okren), 0);

   const tickEvent: EntityTickEvent = {
      type: EntityTickEventType.tongueLaunch,
      entityID: okren,
      data: 0
   };
   registerEntityTickEvent(okren, tickEvent);
}

export function runOkrenCombatAI(okren: Entity, aiHelperComponent: AIHelperComponent, combatAI: OkrenCombatAI, desiredTarget: Entity): void {
   aiHelperComponent.currentAIType = AIType.krumblidCombat;
   
   const okrenComponent = OkrenComponentArray.getComponent(okren);
      
   const transformComponent = TransformComponentArray.getComponent(okren);
   const okrenHitbox = transformComponent.hitboxes[0];

   let target: Entity;
   const existingTongue = getTongue(transformComponent);
   if (existingTongue === null) {
      if (combatAI.tongueCooldownTicks > 0) {
         combatAI.tongueCooldownTicks--;
      }
      if (combatAI.tongueCooldownTicks === 0) {
         // @TEMPORARY cuz the tongue is completely broken right now after the big hitboxes rework
         // deployTongue(okren, okrenHitbox, desiredTarget);
      }

      target = desiredTarget;
   } else {
      // If the tongue is already deployed, stick with that target.
      const okrenTongueComponent = OkrenTongueComponentArray.getComponent(existingTongue);
      if (entityExists(okrenTongueComponent.target)) {
         target = okrenTongueComponent.target;
      } else {
         target = desiredTarget;
      }
   }
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.hitboxes[0];

   let isLeaning = false;
   // @Hack: override the ideal angle
   // Make the okren lean into the swings
   for (const side of OKREN_SIDES) {
      if ((okrenComponent.swingStates[side] === OkrenSwingState.raising && okrenComponent.ticksInStates[side] > Math.floor(Settings.TICK_RATE * 0.25)) || (okrenComponent.swingStates[side] === OkrenSwingState.swinging && okrenComponent.ticksInStates[side] <= Math.floor(Settings.TICK_RATE * 0.15))) {
         const targetDir = okrenHitbox.box.position.angleTo(targetHitbox.box.position);
         const idealAngle = targetDir + (side === OkrenSide.right ? -0.6 : 0.6);

         // @COPYNPASTE
         // @HACK
         applyAccelerationFromGround(okrenHitbox, polarVec2(combatAI.acceleration, targetDir));
         turnHitboxToAngle(okrenHitbox, idealAngle, combatAI.turnSpeed * 1.5, 1.5 / 1.5, false);

         isLeaning = true;
         break;
      }
   }

   if (!isLeaning) {
      // @Incomplete: move using pathfinding!!!
      aiHelperComponent.moveFunc(okren, targetHitbox.box.position, combatAI.acceleration);
      aiHelperComponent.turnFunc(okren, targetHitbox.box.position, combatAI.turnSpeed, combatAI.turnDamping);
   }

   const distanceToTarget = getDistanceFromPointToEntity(okrenHitbox.box.position, targetTransformComponent);
   const isInAttackRange = distanceToTarget <= 245;

   if (isInAttackRange) {
      if (--combatAI.swingCooldownTicks <= 0) {
         combatAI.swingCooldownTicks = 0;
         for (const side of OKREN_SIDES) {
            if (okrenComponent.swingStates[side] === OkrenSwingState.resting && okrenHitboxesHaveReachedIdealAngles(okren, okrenComponent.currentSwingSide, restingIdealAngles)) {
               okrenComponent.swingStates[side] = OkrenSwingState.poising;
               okrenComponent.ticksInStates[side] = 0;
               okrenComponent.currentSwingSide = okrenComponent.currentSwingSide === OkrenSide.right ? OkrenSide.left : OkrenSide.right;
               combatAI.swingCooldownTicks = BOTH_SWING_COOLDOWN_TICKS;
               break;
            }
         }
      }
   }

   // Mandible wiggling
   for (const side of OKREN_SIDES) {
      combatAI.okrenMandibleFlickCountdowns[side]--;
      if (combatAI.okrenMandibleFlickCountdowns[side] <= 0) {
         combatAI.okrenMandibleFlickCountdowns[side] = Math.floor(randFloat(0.08, 0.2) * Settings.TICK_RATE);
         combatAI.okrenMandibleIsIns[side] = !combatAI.okrenMandibleIsIns[side];
      }
      
      const mandibleHitbox = getOkrenMandibleHitbox(okren, side);
      if (mandibleHitbox !== null) {
         const idealAngle = combatAI.okrenMandibleIsIns[side] ? -Math.PI * 0.4 : Math.PI * 0.2;
         turnHitboxToAngle(mandibleHitbox, idealAngle, 20 * Math.PI, 0.05, true);
      }
   }
}