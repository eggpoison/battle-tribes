import { Point, randFloat, randInt, TileIndex, UtilVars } from "battletribes-shared/utils";
import { EntityID, EntityType, FrozenYetiAttackType, PlayerCauseOfDeath, SnowballSize } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { FROZEN_YETI_BITE_COOLDOWN, FROZEN_YETI_GLOBAL_ATTACK_COOLDOWN, FROZEN_YETI_ROAR_COOLDOWN, FROZEN_YETI_SNOWBALL_THROW_COOLDOWN, FROZEN_YETI_STOMP_COOLDOWN, FrozenYetiRockSpikeInfo, FrozenYetiTargetInfo, FrozenYetiVars } from "../entities/mobs/frozen-yeti";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Biome, TileType } from "battletribes-shared/tiles";
import { getAngleDifference, entityIsInVisionRange, getEntitiesInRange, entityHasReachedPosition, stopEntity } from "../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../ai/wander-ai";
import Layer, { getTileX, getTileY } from "../Layer";
import { createRockSpikeConfig } from "../entities/projectiles/rock-spike";
import { createSnowballConfig } from "../entities/snowball";
import { createEntityFromConfig } from "../Entity";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { HealthComponentArray, damageEntity } from "./HealthComponent";
import { PhysicsComponentArray, applyKnockback } from "./PhysicsComponent";
import { ROCK_SPIKE_HITBOX_SIZES } from "./RockSpikeComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";
import { TransformComponentArray, getEntityTile } from "./TransformComponent";
import { WanderAIComponentArray } from "./WanderAIComponent";
import { entityExists, getEntityLayer, getEntityType } from "../world";

const enum Vars {
   TARGET_ENTITY_FORGET_TIME = 10,
   
   SLOW_ACCELERATION = 200,
   ACCELERATION = 400,

   BITE_RANGE = 150,
   ROAR_ARC = UtilVars.PI / 6,
   ROAR_REACH = 450,

   SNOWBALL_THROW_OFFSET = 150,
   STOMP_START_OFFSET = 40,
   BITE_ATTACK_OFFSET = 140,
   BITE_ATTACK_RANGE = 35,

   SNOWBALL_THROW_SPEED_MIN = 590,
   SNOWBALL_THROW_SPEED_MAX = 750
}

export interface FrozenYetiComponentParams {}

export class FrozenYetiComponent {
   public readonly attackingEntities: Partial<Record<number, FrozenYetiTargetInfo>> = {};

   public attackType = FrozenYetiAttackType.none;
   public attackStage = 0;
   public stageProgress = 0;

   public globalAttackCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;
   public snowballThrowCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;
   public roarCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;
   public biteCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;
   public stompCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;

   public lastTargetPosition: Point | null = null;

   public targetPosition: Point | null = null;

   public rockSpikeInfoArray = new Array<FrozenYetiRockSpikeInfo>();
}

export const FrozenYetiComponentArray = new ComponentArray<FrozenYetiComponent>(ServerComponentType.frozenYeti, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const findTargets = (frozenYeti: EntityID, visibleEntities: ReadonlyArray<EntityID>): ReadonlyArray<EntityID> => {
   const layer = getEntityLayer(frozenYeti);
   
   const targets = new Array<EntityID>();
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityTileIndex = getEntityTile(entityTransformComponent);

      const entityType = getEntityType(entity);
      if (layer.tileBiomes[entityTileIndex] === Biome.tundra && entityType !== EntityType.itemEntity && entityType !== EntityType.frozenYeti && entityType !== EntityType.iceSpikes && entityType !== EntityType.snowball) {
         targets.push(entity);
      }
   }

   // Add attacking entities to targets
   const frozenYetiComponent = FrozenYetiComponentArray.getComponent(frozenYeti);
   // @Speed
   for (const targetID of Object.keys(frozenYetiComponent.attackingEntities)) {
      const target = Number(targetID);
      // @Hack. should always be defined here. should be removed.
      if (entityExists(target) && targets.indexOf(target) === -1) {
         targets.push(target);
      }
   }

   return targets;
}

const getAttackType = (frozenYeti: EntityID, target: EntityID, angleToTarget: number, numTargets: number): FrozenYetiAttackType => {
   const frozenYetiComponent = FrozenYetiComponentArray.getComponent(frozenYeti);
   
   if (frozenYetiComponent.globalAttackCooldownTimer > 0) {
      return FrozenYetiAttackType.none;
   }

   const transformComponent = TransformComponentArray.getComponent(frozenYeti);
   const angleDifference = getAngleDifference(angleToTarget, transformComponent.rotation);
   
   // Bite if target is in range and the yeti's mouth is close enough
   if (frozenYetiComponent.biteCooldownTimer === 0 && Math.abs(angleDifference) <= 0.7 && entityIsInVisionRange(transformComponent.position, Vars.BITE_RANGE, target)) {
      return FrozenYetiAttackType.bite;
   }

   // Stomp if two or more targets in range
   if (frozenYetiComponent.stompCooldownTimer === 0 && numTargets >= 2) {
      return FrozenYetiAttackType.stomp;
   }
   
   // @Temporary
   // Roar attack if mouth is close enough
   // if (frozenYetiComponent.roarCooldownTimer === 0 && Math.abs(angleDifference) <= 0.5) {
   //    return FrozenYetiAttackType.roar;
   // }

   // Snow throw attack if mouth is close enough
   if (frozenYetiComponent.snowballThrowCooldownTimer === 0 && Math.abs(angleDifference) <= 0.5) {
      return FrozenYetiAttackType.snowThrow;
   }

   return FrozenYetiAttackType.none;
}

const attemptToAdvanceStage = (frozenYetiComponent: FrozenYetiComponent): void => {
   if (frozenYetiComponent.stageProgress >= 1) {
      frozenYetiComponent.attackStage++;
      frozenYetiComponent.stageProgress = 0;
   }
}

const clearAttack = (frozenYetiComponent: FrozenYetiComponent): void => {
   if (frozenYetiComponent.stageProgress >= 1) {
      frozenYetiComponent.stageProgress = 0;
      frozenYetiComponent.attackStage = 0;
      frozenYetiComponent.attackType = FrozenYetiAttackType.none;
   }
}

/**
 * Stomp
 * @param targets Whomst to stomp
 */
const generateRockSpikeAttackInfo = (frozenYeti: EntityID, targets: ReadonlyArray<EntityID>): Array<FrozenYetiRockSpikeInfo> => {
   // @Speed: Garbage collection

   const transformComponent = TransformComponentArray.getComponent(frozenYeti);
   
   const rockSpikeInfoArray = new Array<FrozenYetiRockSpikeInfo>();
   
   const angles = new Array<number>();

   const numSequences = Math.min(targets.length, 3);
   const availableTargetIndexes = targets.map((_, i) => i);
   for (let i = 0; i < numSequences; i++) {
      const idx = Math.floor(Math.random() * availableTargetIndexes.length);
      const target = targets[availableTargetIndexes[idx]];
      availableTargetIndexes.splice(idx, 1);

      const targetTransformComponent = TransformComponentArray.getComponent(target);
      
      const direction = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);
      
      // Don't do sequence if too close to existing sequence
      let isValid = true;
      for (const angle of angles) {
         if (Math.abs(getAngleDifference(angle, direction)) <= Math.PI / 5) {
            isValid = false;
            break;
         }
      }
      if (!isValid) {
         continue;
      }
      
      const perpendicularDirection = direction + Math.PI / 2;
      angles.push(direction);

      // 
      // Main sequence
      // 
      
      const numMainSequenceNodes = randInt(4, 5);
      
      const startPositionX = transformComponent.position.x + (FrozenYetiVars.FROZEN_YETI_SIZE / 2 + Vars.STOMP_START_OFFSET) * Math.sin(direction);
      const startPositionY = transformComponent.position.y + (FrozenYetiVars.FROZEN_YETI_SIZE / 2 + Vars.STOMP_START_OFFSET) * Math.cos(direction);

      const spikePositions = new Array<Point>();
      const spikeSizes = new Array<number>();
      
      // Create main sequence spikes
      let totalOffset = 0;
      for (let i = 0; i < numMainSequenceNodes; i++) {
         let positionX = startPositionX + totalOffset * Math.sin(direction);
         let positionY = startPositionY + totalOffset * Math.cos(direction);
         totalOffset += randFloat(75, 110);

         // Add perpendicular offset
         const offsetMagnitude = randFloat(-25, 25) * Math.pow(i + 1, 0.75);
         positionX += offsetMagnitude * Math.sin(perpendicularDirection);
         positionY += offsetMagnitude * Math.cos(perpendicularDirection);

         const spawnPosition = new Point(positionX, positionY);
         const size = i <= numMainSequenceNodes / 2 ? 2 : 1;

         spikePositions.push(spawnPosition);
         spikeSizes.push(size);
         rockSpikeInfoArray.push({
            positionX: positionX,
            positionY: positionY,
            size: size
         });
      }

      // Create non-main-sequence spikes
      for (let i = 0; i < 15; i++) {
         const size = 0;
         
         const dist = Math.random();
         const offset = totalOffset * 1.5 * dist;

         let positionX = startPositionX + offset * Math.sin(direction);
         let positionY = startPositionY + offset * Math.cos(direction);

         // Perpendicular offset
         const offsetMagnitude = randFloat(-40, 40) * Math.pow(i + 1, 0.75);
         positionX += offsetMagnitude * Math.sin(perpendicularDirection);
         positionY += offsetMagnitude * Math.cos(perpendicularDirection);

         const position = new Point(positionX, positionY);

         // Make sure the position wouldn't collide with any other spikes
         let positionIsValid = true;
         let minDist = Number.MAX_SAFE_INTEGER;
         for (let i = 0; i < spikePositions.length; i++) {
            const otherPosition = spikePositions[i];
            const otherSize = spikeSizes[i];

            const distance = position.calculateDistanceBetween(otherPosition);
            if (distance <= ROCK_SPIKE_HITBOX_SIZES[size] / 2 + ROCK_SPIKE_HITBOX_SIZES[otherSize] / 2) {
               positionIsValid = false;
               break;
            }
            if (otherSize > 0 && distance < minDist) {
               minDist = distance;
            }
         }
         // Don't create spike if would collide with existing spike or too far away from main sequence spike
         if (!positionIsValid || minDist > 100) {
            continue;
         }

         spikePositions.push(position);
         spikeSizes.push(size);
         rockSpikeInfoArray.push({
            positionX: positionX,
            positionY: positionY,
            size: size
         });
      }
   }

   return rockSpikeInfoArray;
}

const createRockSpikes = (frozenYeti: EntityID, frozenYetiComponent: FrozenYetiComponent): void => {
   for (const info of frozenYetiComponent.rockSpikeInfoArray) {
      const position = new Point(info.positionX, info.positionY);

      const config = createRockSpikeConfig();
      config[ServerComponentType.transform].position.x = position.x;
      config[ServerComponentType.transform].position.y = position.y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config[ServerComponentType.rockSpike].size = info.size;
      config[ServerComponentType.rockSpike].frozenYetiID = frozenYeti;
      createEntityFromConfig(config, getEntityLayer(frozenYeti));
   }
   frozenYetiComponent.rockSpikeInfoArray = [];
}

const spawnSnowball = (frozenYeti: EntityID, size: SnowballSize): void => {
   const transformComponent = TransformComponentArray.getComponent(frozenYeti);
   
   const angle = transformComponent.rotation + randFloat(-1, 1);
   
   const position = transformComponent.position.copy();
   position.x += Vars.SNOWBALL_THROW_OFFSET * Math.sin(angle);
   position.y += Vars.SNOWBALL_THROW_OFFSET * Math.cos(angle);

   const velocityMagnitude = randFloat(Vars.SNOWBALL_THROW_SPEED_MIN, Vars.SNOWBALL_THROW_SPEED_MAX);

   const config = createSnowballConfig();
   config[ServerComponentType.transform].position.x = position.x;
   config[ServerComponentType.transform].position.y = position.y;
   config[ServerComponentType.physics].velocityX = velocityMagnitude * Math.sin(angle);
   config[ServerComponentType.physics].velocityY = velocityMagnitude * Math.cos(angle);
   config[ServerComponentType.snowball].size = size;
   config[ServerComponentType.snowball].yetiID = frozenYeti;
   createEntityFromConfig(config, getEntityLayer(frozenYeti));
}

const throwSnow = (frozenYeti: EntityID): void => {
   // Large snowballs
   for (let i = 0; i < 3; i++) {
      spawnSnowball(frozenYeti, SnowballSize.large);
   }

   // Small snowballs
   for (let i = 0; i < 5; i++) {
      spawnSnowball(frozenYeti, SnowballSize.small);
   }

   // Kickback
   const transformComponent = TransformComponentArray.getComponent(frozenYeti);
   const physicsComponent = PhysicsComponentArray.getComponent(frozenYeti);
   physicsComponent.externalVelocity.x += 50 * Math.sin(transformComponent.rotation + Math.PI);
   physicsComponent.externalVelocity.y += 50 * Math.cos(transformComponent.rotation + Math.PI);
}

const duringRoar = (frozenYeti: EntityID, targets: ReadonlyArray<EntityID>): void => {
   const transformComponent = TransformComponentArray.getComponent(frozenYeti);
   
   for (const entity of targets) {
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      
      // Make sure the entity is in range
      if (transformComponent.position.calculateDistanceSquaredBetween(entityTransformComponent.position) > Vars.ROAR_REACH * Vars.ROAR_REACH) {
         continue;
      }
      
      // Check if the entity is within the arc range of the attack
      const angle = transformComponent.position.calculateAngleBetween(entityTransformComponent.position);
      const angleDifference = getAngleDifference(transformComponent.rotation, angle);
      if (Math.abs(angleDifference) <= Vars.ROAR_ARC / 2) {
         const physicsComponent = PhysicsComponentArray.getComponent(frozenYeti);
         physicsComponent.externalVelocity.x += 1500 / Settings.TPS * Math.sin(angle);
         physicsComponent.externalVelocity.y += 1500 / Settings.TPS * Math.cos(angle);

         if (StatusEffectComponentArray.hasComponent(entity)) {
            applyStatusEffect(entity, StatusEffect.freezing, 5 * Settings.TPS);
         }
      }
   }
}

const doBiteAttack = (frozenYeti: EntityID, angleToTarget: number): void => {
   const transformComponent = TransformComponentArray.getComponent(frozenYeti);
   
   const x = transformComponent.position.x + Vars.BITE_ATTACK_OFFSET * Math.sin(transformComponent.rotation);
   const y = transformComponent.position.y + Vars.BITE_ATTACK_OFFSET * Math.cos(transformComponent.rotation);
   const hitEntities = getEntitiesInRange(getEntityLayer(frozenYeti), x, y, Vars.BITE_ATTACK_RANGE);

   for (let i = 0; i < hitEntities.length; i++) {
      const hitEntity = hitEntities[i];
      if (hitEntity !== frozenYeti) {
         if (HealthComponentArray.hasComponent(hitEntity)) {
            const hitEntityTransformComponent = TransformComponentArray.getComponent(hitEntity);
            
            // @Hack
            const collisionPoint = new Point((hitEntityTransformComponent.position.x + transformComponent.position.x) / 2, (hitEntityTransformComponent.position.y + transformComponent.position.y) / 2);

            damageEntity(hitEntity, frozenYeti, 3, PlayerCauseOfDeath.frozen_yeti, AttackEffectiveness.effective, collisionPoint, 0);
            applyKnockback(hitEntity, 200, angleToTarget);

            if (StatusEffectComponentArray.hasComponent(hitEntity)) {
               applyStatusEffect(hitEntity, StatusEffect.bleeding, 5 * Settings.TPS);
            }
         }
      }
   }
}

function onTick(frozenYetiComponent: FrozenYetiComponent, frozenYeti: EntityID): void {
   // Remove targets which are dead or have been out of aggro long enough
   // @Speed: Remove calls to Object.keys, Number, and hasOwnProperty
   for (const _targetID of Object.keys(frozenYetiComponent.attackingEntities)) {
      const targetID = Number(_targetID);

      const attackingInfo = frozenYetiComponent.attackingEntities[targetID];
      if (typeof attackingInfo === "undefined" || attackingInfo.timeSinceLastAggro >= Vars.TARGET_ENTITY_FORGET_TIME) {
         delete frozenYetiComponent.attackingEntities[targetID];
      } else {
         attackingInfo.timeSinceLastAggro += Settings.I_TPS;
      }
   }

   // @Cleanup: Too long, should be separated into many individual functions
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(frozenYeti);
   const targets = findTargets(frozenYeti, aiHelperComponent.visibleEntities);
   
   if (targets.length === 0 && frozenYetiComponent.attackType === FrozenYetiAttackType.none) {
      frozenYetiComponent.attackType = FrozenYetiAttackType.none;
      frozenYetiComponent.attackStage = 0;
      frozenYetiComponent.stageProgress = 0;

      frozenYetiComponent.globalAttackCooldownTimer = FROZEN_YETI_GLOBAL_ATTACK_COOLDOWN;
      frozenYetiComponent.biteCooldownTimer = FROZEN_YETI_BITE_COOLDOWN;
      frozenYetiComponent.snowballThrowCooldownTimer = FROZEN_YETI_SNOWBALL_THROW_COOLDOWN;
      frozenYetiComponent.roarCooldownTimer = FROZEN_YETI_ROAR_COOLDOWN;
      frozenYetiComponent.stompCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;

      const physicsComponent = PhysicsComponentArray.getComponent(frozenYeti);
      
      // Wander AI
      const layer = getEntityLayer(frozenYeti);
      const wanderAIComponent = WanderAIComponentArray.getComponent(frozenYeti);
      if (wanderAIComponent.targetPositionX !== -1) {
         if (entityHasReachedPosition(frozenYeti, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
            wanderAIComponent.targetPositionX = -1;
            stopEntity(physicsComponent);
         }
      } else if (shouldWander(physicsComponent, 0.6)) {
         let attempts = 0;
         let targetTile: TileIndex;
         do {
            targetTile = getWanderTargetTile(frozenYeti, FrozenYetiVars.VISION_RANGE);
         } while (++attempts <= 50 && (layer.tileIsWalls[targetTile] === 1 || layer.tileBiomes[targetTile] !== TileType.fimbultur));

         const tileX = getTileX(targetTile);
         const tileY = getTileY(targetTile);
         const x = (tileX + Math.random()) * Settings.TILE_SIZE;
         const y = (tileY + Math.random()) * Settings.TILE_SIZE;
         wander(frozenYeti, x, y, Vars.SLOW_ACCELERATION, Math.PI * 0.7);
      } else {
         stopEntity(physicsComponent);
      }

      return;
   }

   frozenYetiComponent.globalAttackCooldownTimer -= Settings.I_TPS;
   if (frozenYetiComponent.globalAttackCooldownTimer < 0) {
      frozenYetiComponent.globalAttackCooldownTimer = 0;
   }
   frozenYetiComponent.snowballThrowCooldownTimer -= Settings.I_TPS;
   if (frozenYetiComponent.snowballThrowCooldownTimer < 0) {
      frozenYetiComponent.snowballThrowCooldownTimer = 0;
   }
   frozenYetiComponent.roarCooldownTimer -= Settings.I_TPS;
   if (frozenYetiComponent.roarCooldownTimer < 0) {
      frozenYetiComponent.roarCooldownTimer = 0;
   }
   frozenYetiComponent.biteCooldownTimer -= Settings.I_TPS;
   if (frozenYetiComponent.biteCooldownTimer < 0) {
      frozenYetiComponent.biteCooldownTimer = 0;
   }
   frozenYetiComponent.stompCooldownTimer -= Settings.I_TPS;
   if (frozenYetiComponent.stompCooldownTimer < 0) {
      frozenYetiComponent.stompCooldownTimer = 0;
   }

   const transformComponent = TransformComponentArray.getComponent(frozenYeti);
   
   // If any target has dealt damage to the yeti, choose the target based on which one has dealt the most damage to it
   // Otherwise attack the closest target
   let target: EntityID | null = null; 
   if (Object.keys(frozenYetiComponent.attackingEntities).length === 0) {
      // Choose based on distance
      let minDist = Number.MAX_SAFE_INTEGER;
      for (const currentTarget of targets) {
         const targetTransformComponent = TransformComponentArray.getComponent(currentTarget);
         
         const distance = transformComponent.position.calculateDistanceBetween(targetTransformComponent.position);
         if (distance < minDist) {
            minDist = distance;
            target = currentTarget;
         }
      }
   } else {
      let mostDamageDealt = -1;
      for (const currentTarget of targets) {
         const targetInfo = frozenYetiComponent.attackingEntities[currentTarget];
         if (typeof targetInfo !== "undefined" && targetInfo.damageDealtToSelf > mostDamageDealt) {
            mostDamageDealt = targetInfo.damageDealtToSelf;
            target = currentTarget;
         }
      }
   }
   if (target !== null) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);
      // @Speed: Garbage collection
      frozenYetiComponent.lastTargetPosition = targetTransformComponent.position.copy();
   }

   let angleToTarget: number;
   if (target !== null) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);
      angleToTarget = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);
   } else {
      angleToTarget = transformComponent.position.calculateAngleBetween(frozenYetiComponent.lastTargetPosition!);
   }
   if (angleToTarget < 0) {
      angleToTarget += 2 * Math.PI;
   }
   
   const physicsComponent = PhysicsComponentArray.getComponent(frozenYeti);

   if (frozenYetiComponent.attackType === FrozenYetiAttackType.none && target !== null) {
      frozenYetiComponent.attackType = getAttackType(frozenYeti, target, angleToTarget, targets.length);
   }
   switch (frozenYetiComponent.attackType) {
      case FrozenYetiAttackType.stomp: {
         stopEntity(physicsComponent);

         switch (frozenYetiComponent.attackStage) {
            // Windup
            case 0: {
               if (frozenYetiComponent.stageProgress === 0) {
                  frozenYetiComponent.rockSpikeInfoArray = generateRockSpikeAttackInfo(frozenYeti, targets);
               }
               
               frozenYetiComponent.stageProgress += 0.75 / Settings.TPS;
               attemptToAdvanceStage(frozenYetiComponent);
               if (frozenYetiComponent.stageProgress === 0) {
                  createRockSpikes(frozenYeti, frozenYetiComponent);
               }
               break;
            }
            // Stomp
            case 1: {
               frozenYetiComponent.stageProgress += 2 / Settings.TPS;
               attemptToAdvanceStage(frozenYetiComponent);
               break;
            }
            // Daze
            case 2: {
               frozenYetiComponent.stageProgress += 2 / Settings.TPS;
               clearAttack(frozenYetiComponent);
               if (frozenYetiComponent.stageProgress === 0) {
                  frozenYetiComponent.stompCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;
                  frozenYetiComponent.globalAttackCooldownTimer = FROZEN_YETI_GLOBAL_ATTACK_COOLDOWN;
               }
               break;
            }
         }
         
         break;
      }
      case FrozenYetiAttackType.snowThrow: {
         stopEntity(physicsComponent);
         
         switch (frozenYetiComponent.attackStage) {
            // Windup
            case 0: {
               physicsComponent.targetRotation = angleToTarget;
               physicsComponent.turnSpeed = 0.9;
               
               frozenYetiComponent.stageProgress += 0.55 / Settings.TPS;
               attemptToAdvanceStage(frozenYetiComponent);
               break;
            }
            // Throw
            case 1: {
               frozenYetiComponent.stageProgress += 3 / Settings.TPS;
               attemptToAdvanceStage(frozenYetiComponent);
               if (frozenYetiComponent.stageProgress === 0) {
                  throwSnow(frozenYeti);
               }
               break;
            }
            // Wind down
            case 2: {
               frozenYetiComponent.stageProgress += 2 / Settings.TPS;
               clearAttack(frozenYetiComponent);
               if (frozenYetiComponent.stageProgress === 0) {
                  frozenYetiComponent.snowballThrowCooldownTimer = FROZEN_YETI_SNOWBALL_THROW_COOLDOWN
                  frozenYetiComponent.globalAttackCooldownTimer = FROZEN_YETI_GLOBAL_ATTACK_COOLDOWN;
               }
               break;
            }
         }
         
         break;
      }
      case FrozenYetiAttackType.roar: {
         stopEntity(physicsComponent);

         switch (frozenYetiComponent.attackStage) {
            // Windup
            case 0: {
               // Track target
               physicsComponent.targetRotation = angleToTarget;
               physicsComponent.turnSpeed = 0.7;

               frozenYetiComponent.stageProgress += 0.4 / Settings.TPS;
               attemptToAdvanceStage(frozenYetiComponent);
               break;
            }
            // Roar attack
            case 1: {
               // Track target
               physicsComponent.targetRotation = angleToTarget;
               physicsComponent.turnSpeed = 0.35;

               duringRoar(frozenYeti, targets);
               
               frozenYetiComponent.stageProgress += 0.5 / Settings.TPS;
               clearAttack(frozenYetiComponent);
               if (frozenYetiComponent.stageProgress === 0) {
                  frozenYetiComponent.roarCooldownTimer = FROZEN_YETI_ROAR_COOLDOWN;
                  frozenYetiComponent.globalAttackCooldownTimer = FROZEN_YETI_GLOBAL_ATTACK_COOLDOWN;
               }
               break;
            }
         }

         break;
      }
      case FrozenYetiAttackType.bite: {
         switch (frozenYetiComponent.attackStage) {
            // Charge
            case 0: {
               // Move towards the target
               stopEntity(physicsComponent);

               physicsComponent.targetRotation = angleToTarget;
               physicsComponent.turnSpeed = 0.9;

               frozenYetiComponent.stageProgress += 1.15 / Settings.TPS;
               attemptToAdvanceStage(frozenYetiComponent);
               break;
            }
            // Lunge
            case 1: {
               physicsComponent.acceleration.x = Vars.ACCELERATION * Math.sin(angleToTarget);
               physicsComponent.acceleration.y = Vars.ACCELERATION * Math.cos(angleToTarget);

               // Lunge forwards at the beginning of this stage
               if (frozenYetiComponent.stageProgress === 0) {
                  physicsComponent.externalVelocity.x += 450 * Math.sin(transformComponent.rotation);
                  physicsComponent.externalVelocity.y += 450 * Math.cos(transformComponent.rotation);
               }

               frozenYetiComponent.stageProgress += 2 / Settings.TPS;
               attemptToAdvanceStage(frozenYetiComponent);
               if (frozenYetiComponent.stageProgress === 0) {
                  frozenYetiComponent.biteCooldownTimer = FROZEN_YETI_BITE_COOLDOWN;
                  frozenYetiComponent.globalAttackCooldownTimer = FROZEN_YETI_GLOBAL_ATTACK_COOLDOWN;
                  doBiteAttack(frozenYeti, angleToTarget);
               }
               break;
            }
            // Wind-down
            case 2: {
               physicsComponent.acceleration.x = Vars.ACCELERATION * Math.sin(angleToTarget);
               physicsComponent.acceleration.y = Vars.ACCELERATION * Math.cos(angleToTarget);

               physicsComponent.targetRotation = angleToTarget;
               physicsComponent.turnSpeed = 1.3;

               frozenYetiComponent.stageProgress += 2.5 / Settings.TPS;
               clearAttack(frozenYetiComponent);
            }
         }

         break;
      }
      case FrozenYetiAttackType.none: {
         // Move towards the target
         physicsComponent.acceleration.x = Vars.ACCELERATION * Math.sin(angleToTarget);
         physicsComponent.acceleration.y = Vars.ACCELERATION * Math.cos(angleToTarget);

         physicsComponent.targetRotation = angleToTarget;
         physicsComponent.turnSpeed = Math.PI;
         
         break;
      }
   }
}

function getDataLength(entity: EntityID): number {
   const frozenYetiComponent = FrozenYetiComponentArray.getComponent(entity);

   let lengthBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 *Float32Array.BYTES_PER_ELEMENT * frozenYetiComponent.rockSpikeInfoArray.length;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const frozenYetiComponent = FrozenYetiComponentArray.getComponent(entity);

   packet.addNumber(frozenYetiComponent.attackType);
   packet.addNumber(frozenYetiComponent.attackStage);
   packet.addNumber(frozenYetiComponent.stageProgress);

   packet.addNumber(frozenYetiComponent.rockSpikeInfoArray.length);
   for (let i = 0; i < frozenYetiComponent.rockSpikeInfoArray.length; i++) {
      const rockSpikeInfo = frozenYetiComponent.rockSpikeInfoArray[i];
      packet.addNumber(rockSpikeInfo.positionX);
      packet.addNumber(rockSpikeInfo.positionY);
   }
}