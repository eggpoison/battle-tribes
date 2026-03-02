import { Biome } from "../../../shared/src/biomes";
import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { ItemType } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { StatusEffect } from "../../../shared/src/status-effects";
import { TileType } from "../../../shared/src/tiles";
import { customTickIntervalHasPassed, getAbsAngleDiff, Point, polarVec2, secondsToTicks } from "../../../shared/src/utils";
import { getDistanceFromPointToHitbox } from "../ai-shared";
import { hitboxIsCollidingWithEntity } from "../collision-detection";
import { addHitboxVelocity, applyAbsoluteKnockback, getHitboxTile, Hitbox } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import Tribe from "../Tribe";
import { destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { LocalBiome } from "../world-generation/terrain-generation-utils";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { addLocalInvulnerabilityHash, canDamageEntity, damageEntity, getEntityHealth, healEntity, HealthComponentArray } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";
import { TamingComponentArray } from "./TamingComponent";
import { TransformComponentArray } from "./TransformComponent";
import { TribeComponentArray } from "./TribeComponent";

interface TribesmanTruce {
   readonly tribe: Tribe;
   ticksRemaining: number;
}

const LEAP_START_DISTANCE = 75;

const LEAP_DURATION_TICKS = secondsToTicks(0.32);
/** Cooldown after a leap ends that another leap cannot be initiated */
const LEAP_COOLDOWN_TICKS = secondsToTicks(0.9);
const LEAP_CHARGE_TICKS = secondsToTicks(0.25);

// Whenever the wraith leaps or eats a meat item, they go on cooldown before they can eat another meat item
const EAT_CHOMP_COOLDOWN_TICKS = secondsToTicks(0.45);
const LEAP_CHOMP_COOLDOWN_TICKS = secondsToTicks(0.85);

// @Cleanup: shouldn't be exported everywhere!
export const INGU_SERPENT_DIRECTION_CHANGE_COOLDOWN_TICKS = secondsToTicks(0.3);

const TRUCE_TIME_TICKS = secondsToTicks(20);

const SLOW_ACCELERATION = 850;

export class InguSerpentComponent {
   public homeBiome: LocalBiome | null = null;
   
   public currentTurnDirectionIsClockwise = true;
   public directionChangeCooldownTicks = 0;
   public currentDirectionTicks = 0;
   
   public isLeaping = false;
   public leapElapsedTicks = 0;
   public leapCooldownTicks = LEAP_COOLDOWN_TICKS;
   public isChargingLeap = false;
   public leapChargeTicks = 0;

   public chompersCooldownTicks = EAT_CHOMP_COOLDOWN_TICKS;

   public tribesmanTruces = new Array<TribesmanTruce>();
}

export const InguSerpentComponentArray = new ComponentArray<InguSerpentComponent>(ServerComponentType.inguSerpent, true, getDataLength, addDataToPacket);
InguSerpentComponentArray.onJoin = onJoin;
InguSerpentComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
InguSerpentComponentArray.onHitboxCollision = onHitboxCollision;

function onJoin(serpent: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(serpent);
   const hitbox = transformComponent.hitboxes[0];
   const tile = getHitboxTile(hitbox);
   
   const layer = getEntityLayer(serpent);
   const localBiome = layer.getTileLocalBiome(tile);
   
   const inguSerpentComponent = InguSerpentComponentArray.getComponent(serpent);
   inguSerpentComponent.homeBiome = localBiome;
}

const isTarget = (serpent: Entity, entity: Entity): boolean => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   // @HACK so that it can attack trees n shit
   const tamingComponent = TamingComponentArray.getComponent(serpent);
   if (tamingComponent.attackTarget === entity) {
      return true;
   }

   // @HACK @TEMPORARY cuz im doing the hack where i set snobe collision mask to 0 when they are dug in
   if (getEntityType(entity) === EntityType.snobe) {
      if (hitbox.collisionMask === 0) {
         return false;
      }
   }

   // Once prey has moved outside of the tundra then don't pursue any longer
   const tile = getHitboxTile(hitbox);
   const layer = getEntityLayer(entity);
   if (layer.getTileBiome(tile) !== Biome.tundra) {
      return false;
   }

   if (TribeComponentArray.hasComponent(entity)) {
      const entityTribeComponent = TribeComponentArray.getComponent(entity);
      
      // Don't attack its tamers
      if (entityTribeComponent.tribe === tamingComponent.tameTribe) {
         return false;
      }

      // Don't attack tribesmen it is in a truce with
      const inguSerpentComponent = InguSerpentComponentArray.getComponent(serpent);
      for (const truce of inguSerpentComponent.tribesmanTruces) {
         if (entityTribeComponent.tribe === truce.tribe) {
            return false;
         }
      }
   }
   
   const entityType = getEntityType(entity);
   // @HACK @INCOMPLETE
   return entityType === EntityType.player || entityType === EntityType.snobe || entityType === EntityType.tukmok;
}

const getTarget = (serpent: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(serpent);
   const hitbox = transformComponent.hitboxes[0];
   
   let target: Entity | null = null;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!isTarget(serpent, entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const targetHitbox = entityTransformComponent.hitboxes[0];
      const dist = hitbox.box.position.distanceTo(targetHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

const attackEntity = (serpent: Entity, target: Entity): void => {
   const inguSerpentComponent = InguSerpentComponentArray.getComponent(serpent);
   const transformComponent = TransformComponentArray.getComponent(serpent);
   const aiHelperComponent = AIHelperComponentArray.getComponent(serpent);

   const headHitbox = transformComponent.hitboxes[0];

   const targetTransformComponent = TransformComponentArray.getComponent(target);
   let targetHitbox = targetTransformComponent.hitboxes[0];
   let minDist = headHitbox.box.position.distanceTo(targetHitbox.box.position);
   for (let i = 1; i < targetTransformComponent.hitboxes.length; i++) {
      const hitbox = targetTransformComponent.hitboxes[i];
      const dist = hitbox.box.position.distanceTo(targetHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         targetHitbox = hitbox;
      }
   }

   const headToTarget = headHitbox.box.position.angleTo(targetHitbox.box.position);
   const distFromTarget = getDistanceFromPointToHitbox(headHitbox.box.position, targetHitbox);

   if (!inguSerpentComponent.isLeaping && inguSerpentComponent.leapCooldownTicks === 0 && distFromTarget <= LEAP_START_DISTANCE && getAbsAngleDiff(headHitbox.box.angle, headToTarget) < 0.36) {
      inguSerpentComponent.isChargingLeap = true;
   }

   if (inguSerpentComponent.isChargingLeap && inguSerpentComponent.leapChargeTicks < LEAP_CHARGE_TICKS) {
      inguSerpentComponent.leapChargeTicks++;
   }

   if (!inguSerpentComponent.isLeaping && inguSerpentComponent.leapChargeTicks >= LEAP_CHARGE_TICKS) {
      // Stop charging leap and leap!

      inguSerpentComponent.isChargingLeap = false;
      inguSerpentComponent.leapChargeTicks = 0;
      inguSerpentComponent.isLeaping = true;
      inguSerpentComponent.leapElapsedTicks = 0;

      inguSerpentComponent.chompersCooldownTicks = LEAP_CHOMP_COOLDOWN_TICKS;

      const tickEvent: EntityTickEvent = {
         entityID: serpent,
         type: EntityTickEventType.inguSerpentLeap,
         data: 0
      };
      registerEntityTickEvent(serpent, tickEvent);

      // Initial jump
      const bodyHitbox = transformComponent.hitboxes[0];
      const bodyToTargetDir = bodyHitbox.box.position.angleTo(targetHitbox.box.position);
      addHitboxVelocity(bodyHitbox, polarVec2(300, bodyToTargetDir));

      const headToTargetDir = headHitbox.box.position.angleTo(targetHitbox.box.position);
      addHitboxVelocity(headHitbox, polarVec2(300, headToTargetDir));
   }

   if (inguSerpentComponent.isChargingLeap) {
      aiHelperComponent.turnFunc(serpent, targetHitbox.box.position, 3.5 * Math.PI, 1.8);
   } else if (inguSerpentComponent.isLeaping) {
      aiHelperComponent.turnFunc(serpent, targetHitbox.box.position, 3.5 * Math.PI, 1.8);
      
      inguSerpentComponent.leapElapsedTicks++;
      if (inguSerpentComponent.leapElapsedTicks >= LEAP_DURATION_TICKS) {
         inguSerpentComponent.isLeaping = false;
         inguSerpentComponent.leapCooldownTicks = LEAP_COOLDOWN_TICKS;
      }
   } else {
      if (distFromTarget > LEAP_START_DISTANCE - 15) {
         aiHelperComponent.moveFunc(serpent, targetHitbox.box.position, 1550);
      }
      aiHelperComponent.turnFunc(serpent, targetHitbox.box.position, 3.5 * Math.PI, 1.8);

      if (customTickIntervalHasPassed(getEntityAgeTicks(serpent), 1.6)) {
         const tickEvent: EntityTickEvent = {
            entityID: serpent,
            type: EntityTickEventType.inguSerpentAngry,
            data: 0
         };
         registerEntityTickEvent(serpent, tickEvent);
      }
   }
}

function onTick(serpent: Entity): void {
   const inguSerpentComponent = InguSerpentComponentArray.getComponent(serpent);
   if (inguSerpentComponent.directionChangeCooldownTicks > 0) {
      inguSerpentComponent.directionChangeCooldownTicks--;
   }
   if (inguSerpentComponent.leapCooldownTicks > 0) {
      inguSerpentComponent.leapCooldownTicks--;
   }
   if (inguSerpentComponent.chompersCooldownTicks > 0) {
      inguSerpentComponent.chompersCooldownTicks--;
   }
   inguSerpentComponent.currentDirectionTicks++;

   for (let i = 0; i < inguSerpentComponent.tribesmanTruces.length; i++) {
      const truce = inguSerpentComponent.tribesmanTruces[i];
      if (truce.ticksRemaining > 0) {
         truce.ticksRemaining--;
      } else {
         inguSerpentComponent.tribesmanTruces.splice(i, 1);
         i--;
      }
   }

   const tamingComponent = TamingComponentArray.getComponent(serpent);

   if (entityExists(tamingComponent.attackTarget)) {
      attackEntity(serpent, tamingComponent.attackTarget);
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(serpent);
   const aiHelperComponent = AIHelperComponentArray.getComponent(serpent);

   const headHitbox = transformComponent.hitboxes[0];
   
   // Go to follow target if possible
   // @Copynpaste
   if (entityExists(tamingComponent.followTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.followTarget);
      const targetHitbox = targetTransformComponent.hitboxes[0];
      
      aiHelperComponent.moveFunc(serpent, targetHitbox.box.position, SLOW_ACCELERATION);
      aiHelperComponent.turnFunc(serpent, targetHitbox.box.position, 3.5 * Math.PI, 1.8);
      return;
   }

   // Eat snobe meat
   // @Copynpaste from yeti component and snobe component!
   {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestFoodItem: Entity | null = null;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(entity) !== EntityType.itemEntity) {
            continue;
         }

         const itemComponent = ItemComponentArray.getComponent(entity);
         if (itemComponent.item.type === ItemType.rawSnobeMeat) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = entityTransformComponent.hitboxes[0];
            
            const distance = headHitbox.box.position.distanceTo(entityHitbox.box.position);
            if (distance < minDist) {
               minDist = distance;
               closestFoodItem = entity;
            }
         }
      }
      if (closestFoodItem !== null) {
         // If waiting until the wraith can chomp again, just stay still and do nothing
         if (inguSerpentComponent.chompersCooldownTicks > 0) {
            return;
         }
         
         const foodTransformComponent = TransformComponentArray.getComponent(closestFoodItem);
         const foodHitbox = foodTransformComponent.hitboxes[0];
         
         aiHelperComponent.turnFunc(serpent, foodHitbox.box.position, 3.5 * Math.PI, 1.8);
         aiHelperComponent.moveFunc(serpent, foodHitbox.box.position, SLOW_ACCELERATION);

         const directionToFood = headHitbox.box.position.angleTo(foodHitbox.box.position);
         if (hitboxIsCollidingWithEntity(headHitbox, closestFoodItem) && getAbsAngleDiff(headHitbox.box.angle, directionToFood) < 0.15) {
            healEntity(serpent, 3, serpent);
            destroyEntity(closestFoodItem);

            inguSerpentComponent.chompersCooldownTicks = EAT_CHOMP_COOLDOWN_TICKS;
            
            const itemComponent = ItemComponentArray.getComponent(closestFoodItem);
            if (itemComponent.throwingEntity !== null) {
               const tamingComponent = TamingComponentArray.getComponent(serpent);
               tamingComponent.foodEatenInTier++;
            }

            // @Hack
            const tickEvent: EntityTickEvent = {
               entityID: serpent,
               type: EntityTickEventType.cowEat,
               data: 0
            };
            registerEntityTickEvent(serpent, tickEvent);
         }
         return;
      }
   }

   const target = getTarget(serpent, aiHelperComponent);
   if (target !== null) {
      attackEntity(serpent, target);
      return;
   }

   // If not in its home biome, move back to home
   if (inguSerpentComponent.homeBiome !== null) {
      const bodyHitbox = transformComponent.hitboxes[0];

      const layer = getEntityLayer(serpent);
      const tile = getHitboxTile(bodyHitbox);
      if (layer.getTileType(tile) !== TileType.permafrost) {
         const homePos = new Point(inguSerpentComponent.homeBiome.centerX, inguSerpentComponent.homeBiome.centerY);
         // @HACK this should use pathfinding to get back
         aiHelperComponent.moveFunc(serpent, homePos, SLOW_ACCELERATION);
         aiHelperComponent.turnFunc(serpent, homePos, 3.5 * Math.PI, 1.8);
         return;
      }
   }
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(serpent);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(serpent, wanderAI.targetPosition, wanderAI.acceleration);
      aiHelperComponent.turnFunc(serpent, wanderAI.targetPosition, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

const addTruce = (serpent: Entity, tribe: Tribe): void => {
   const inguSerpentComponent = InguSerpentComponentArray.getComponent(serpent);

   let existingTruce: TribesmanTruce | null = null;
   for (const truce of inguSerpentComponent.tribesmanTruces) {
      if (truce.tribe === tribe) {
         existingTruce = truce;
         break;
      }
   }

   if (existingTruce !== null) {
      existingTruce.ticksRemaining = TRUCE_TIME_TICKS;
   } else {
      inguSerpentComponent.tribesmanTruces.push({
         tribe: tribe,
         ticksRemaining: TRUCE_TIME_TICKS
      });
   }
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (!hitbox.flags.includes(HitboxFlag.INGU_SERPENT_HEAD)) {
      return;
   }
   
   // const wraithComponent = WraithComponentArray.getComponent(wraith);
   // if (!wraithComponent.isLeaping) {
   //    return;
   // }

   const serpent = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   if (!isTarget(serpent, collidingEntity)) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const localInvulnerabilityHash = "inguSerpent" + serpent;
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, localInvulnerabilityHash)) {
      return;
   }

   const hitDir = hitbox.box.position.angleTo(collidingHitbox.box.position);

   damageEntity(collidingHitbox, serpent, 3, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(200, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, localInvulnerabilityHash, 0.3);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.freezing, 3 * Settings.TICK_RATE);
   }

   // @HACK: should only work if the snobe is being led!!
   // If it kills a tamed snobe, the tribesman who tamed it gets a truce
   if (getEntityHealth(collidingEntity) <= 0 && getEntityType(collidingEntity) === EntityType.snobe) {
      const tamingComponent = TamingComponentArray.getComponent(collidingEntity);
      if (tamingComponent.tameTribe !== null) {
         addTruce(serpent, tamingComponent.tameTribe);
      }
   }
}