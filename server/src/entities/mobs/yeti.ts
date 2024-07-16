import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, SnowballSize, PlayerCauseOfDeath, EntityID } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome } from "webgl-test-shared/dist/tiles";
import { createEntityFromConfig } from "../../Entity";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity, healEntity } from "../../components/HealthComponent";
import { WanderAIComponentArray } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { YetiComponentArray } from "../../components/YetiComponent";
import Board from "../../Board";
import { createItemsOverEntity } from "../../entity-shared";
import { createSnowballConfig } from "../snowball";
import { AIHelperComponentArray } from "../../components/AIHelperComponent";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ItemComponentArray } from "../../components/ItemComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { SnowballComponentArray } from "../../components/SnowballComponent";
import { TribeComponentArray } from "../../components/TribeComponent";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.wanderAI
   | ServerComponentType.aiHelper
   | ServerComponentType.yeti;

const YETI_SIZE = 128;

const VISION_RANGE = 500;

const ATTACK_PURSUE_TIME_TICKS = 5 * Settings.TPS;

export const YETI_SNOW_THROW_COOLDOWN = 7;
const SMALL_SNOWBALL_THROW_SPEED = [550, 650] as const;
const LARGE_SNOWBALL_THROW_SPEED = [350, 450] as const;
const SNOW_THROW_ARC = Math.PI/5;
const SNOW_THROW_OFFSET = 64;
const SNOW_THROW_WINDUP_TIME = 1.75;
const SNOW_THROW_HOLD_TIME = 0.1;
const SNOW_THROW_RETURN_TIME = 0.6;
const SNOW_THROW_KICKBACK_AMOUNT = 110;

const TURN_SPEED = Math.PI * 3/2;

export enum SnowThrowStage {
   windup,
   hold,
   return
}

export function createYetiConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.yeti,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(3, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, YETI_SIZE / 2)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 100
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.freezing
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.aiHelper]: {
         visionRange: VISION_RANGE
      },
      [ServerComponentType.yeti]: {
         territory: []
      }
   };
}

const throwSnowball = (yeti: EntityID, size: SnowballSize, throwAngle: number): void => {
   const transformComponent = TransformComponentArray.getComponent(yeti);
   
   const angle = throwAngle + randFloat(-SNOW_THROW_ARC, SNOW_THROW_ARC);
   
   const position = transformComponent.position.copy();
   position.x += SNOW_THROW_OFFSET * Math.sin(angle);
   position.y += SNOW_THROW_OFFSET * Math.cos(angle);

   let velocityMagnitude: number;
   if (size === SnowballSize.small) {
      velocityMagnitude = randFloat(...SMALL_SNOWBALL_THROW_SPEED);
   } else {
      velocityMagnitude = randFloat(...LARGE_SNOWBALL_THROW_SPEED);
   }

   const config = createSnowballConfig();
   config[ServerComponentType.transform].position.x = position.x;
   config[ServerComponentType.transform].position.y = position.y;
   config[ServerComponentType.physics].velocityX += velocityMagnitude * Math.sin(angle);
   config[ServerComponentType.physics].velocityY += velocityMagnitude * Math.cos(angle);
   config[ServerComponentType.snowball].size = size;
   config[ServerComponentType.snowball].yetiID = yeti;
   createEntityFromConfig(config);
}

const throwSnow = (yeti: EntityID, target: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(yeti);
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   
   const throwAngle = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);

   // Large snowballs
   for (let i = 0; i < 2; i++) {
      throwSnowball(yeti, SnowballSize.large, throwAngle);
   }

   // Small snowballs
   for (let i = 0; i < 3; i++) {
      throwSnowball(yeti, SnowballSize.small, throwAngle);
   }

   // Kickback
   const physicsComponent = PhysicsComponentArray.getComponent(yeti);
   physicsComponent.velocity.x += SNOW_THROW_KICKBACK_AMOUNT * Math.sin(throwAngle * Math.PI);
   physicsComponent.velocity.y += SNOW_THROW_KICKBACK_AMOUNT * Math.cos(throwAngle * Math.PI);
}

const getYetiTarget = (yeti: EntityID, visibleEntities: ReadonlyArray<EntityID>): EntityID | null => {
   const yetiComponent = YetiComponentArray.getComponent(yeti);

   // @Speed
   // Decrease remaining pursue time
   for (const id of Object.keys(yetiComponent.attackingEntities).map(idString => Number(idString))) {
      const attackingEntityInfo = yetiComponent.attackingEntities[id]!;
      attackingEntityInfo.remainingPursueTicks--;
      if (attackingEntityInfo!.remainingPursueTicks <= 0) {
         delete yetiComponent.attackingEntities[id];
      }
   }
   
   let mostDamageDealt = 0;
   let target: EntityID | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      const entityType = Board.getEntityType(entity);

      // Don't chase entities without health or natural tundra resources or snowballs or frozen yetis who aren't attacking the yeti
      if (!HealthComponentArray.hasComponent(entity) || entityType === EntityType.iceSpikes || entityType === EntityType.snowball || (entityType === EntityType.frozenYeti && !yetiComponent.attackingEntities.hasOwnProperty(entity))) {
         continue;
      }
      
      // Don't chase frostlings which aren't attacking the yeti
      if ((entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior || entityType === EntityType.player) && !yetiComponent.attackingEntities.hasOwnProperty(entity)) {
         const tribeComponent = TribeComponentArray.getComponent(entity);
         if (tribeComponent.tribe.tribeType === TribeType.frostlings) {
            continue;
         }
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);

      // Don't attack entities which aren't attacking the yeti and aren't encroaching on its territory
      if (!yetiComponent.attackingEntities.hasOwnProperty(entity) && !yetiComponent.territory.includes(entityTransformComponent.tile)) {
         continue;
      }

      const attackingInfo = yetiComponent.attackingEntities[entity];
      if (typeof attackingInfo !== "undefined") {
         const damageDealt = attackingInfo.totalDamageDealt;
         if (damageDealt > mostDamageDealt) {
            mostDamageDealt = damageDealt;
            target = entity;
         }
      } else {
         // Attack targets which haven't dealt any damage (with the lowest priority)
         if (mostDamageDealt === 0) {
            target = entity;
         }
      }
   }

   return target;
}

export function tickYeti(yeti: EntityID): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(yeti);
   const yetiComponent = YetiComponentArray.getComponent(yeti);
   const transformComponent = TransformComponentArray.getComponent(yeti);

   if (yetiComponent.isThrowingSnow) {
      // If the target has run outside the yeti's vision range, cancel the attack
      if (yetiComponent.attackTarget !== null && transformComponent.position.calculateDistanceBetween(TransformComponentArray.getComponent(yetiComponent.attackTarget).position) > VISION_RANGE) {
         yetiComponent.snowThrowAttackProgress = 1;
         yetiComponent.attackTarget = null;
         yetiComponent.isThrowingSnow = false;
      } else {
         const targetTransformComponent = TransformComponentArray.getComponent(yetiComponent.attackTarget!);
         
         switch (yetiComponent.snowThrowStage) {
            case SnowThrowStage.windup: {
               yetiComponent.snowThrowAttackProgress -= Settings.I_TPS / SNOW_THROW_WINDUP_TIME;
               if (yetiComponent.snowThrowAttackProgress <= 0) {
                  throwSnow(yeti, yetiComponent.attackTarget!);
                  yetiComponent.snowThrowAttackProgress = 0;
                  yetiComponent.snowThrowCooldown = YETI_SNOW_THROW_COOLDOWN;
                  yetiComponent.snowThrowStage = SnowThrowStage.hold;
                  yetiComponent.snowThrowHoldTimer = 0;
               }

               const physicsComponent = PhysicsComponentArray.getComponent(yeti);
               physicsComponent.targetRotation = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);;
               physicsComponent.turnSpeed = TURN_SPEED;

               stopEntity(physicsComponent);
               return;
            }
            case SnowThrowStage.hold: {
               yetiComponent.snowThrowHoldTimer += Settings.I_TPS;
               if (yetiComponent.snowThrowHoldTimer >= SNOW_THROW_HOLD_TIME) {
                  yetiComponent.snowThrowStage = SnowThrowStage.return;
               }

               const physicsComponent = PhysicsComponentArray.getComponent(yeti);
               physicsComponent.targetRotation = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);;
               physicsComponent.turnSpeed = TURN_SPEED;

               stopEntity(physicsComponent);
               return;
            }
            case SnowThrowStage.return: {
               yetiComponent.snowThrowAttackProgress += Settings.I_TPS / SNOW_THROW_RETURN_TIME;
               if (yetiComponent.snowThrowAttackProgress >= 1) {
                  yetiComponent.snowThrowAttackProgress = 1;
                  yetiComponent.attackTarget = null;
                  yetiComponent.isThrowingSnow = false;
               }
            }
         }
      }
   } else if (yetiComponent.snowThrowCooldown === 0 && !yetiComponent.isThrowingSnow) {
      const target = getYetiTarget(yeti, aiHelperComponent.visibleEntities);
      if (target !== null) {
         yetiComponent.isThrowingSnow = true;
         yetiComponent.attackTarget = target;
         yetiComponent.snowThrowAttackProgress = 1;
         yetiComponent.snowThrowStage = SnowThrowStage.windup;
      }
   }

   yetiComponent.snowThrowCooldown -= Settings.I_TPS;
   if (yetiComponent.snowThrowCooldown < 0) {
      yetiComponent.snowThrowCooldown = 0;
   }

   // Chase AI
   const chaseTarget = getYetiTarget(yeti, aiHelperComponent.visibleEntities);
   if (chaseTarget !== null) {
      const targetTransformComponent = TransformComponentArray.getComponent(chaseTarget);
      moveEntityToPosition(yeti, targetTransformComponent.position.x, targetTransformComponent.position.y, 375, TURN_SPEED);
      return;
   }

   // Eat raw beef and leather
   {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestFoodItem: EntityID | null = null;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (Board.getEntityType(entity) !== EntityType.itemEntity) {
            continue;
         }

         const itemComponent = ItemComponentArray.getComponent(entity);
         if (itemComponent.itemType === ItemType.raw_beef || itemComponent.itemType === ItemType.raw_fish) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            
            const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
            if (distance < minDist) {
               minDist = distance;
               closestFoodItem = entity;
            }
         }
      }
      if (closestFoodItem !== null) {
         const foodTransformComponent = TransformComponentArray.getComponent(closestFoodItem);
         
         moveEntityToPosition(yeti, foodTransformComponent.position.x, foodTransformComponent.position.y, 100, TURN_SPEED);

         if (entitiesAreColliding(yeti, closestFoodItem) !== CollisionVars.NO_COLLISION) {
            healEntity(yeti, 3, yeti);
            Board.destroyEntity(closestFoodItem);
         }
         return;
      }
   }
   
   const physicsComponent = PhysicsComponentArray.getComponent(yeti);

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(yeti);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(yeti, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.6)) {
      let attempts = 0;
      let targetTile: Tile;
      do {
         targetTile = getWanderTargetTile(yeti, VISION_RANGE);
      } while (++attempts <= 50 && (targetTile.isWall || targetTile.biome !== Biome.tundra || !yetiComponent.territory.includes(targetTile)));

      const x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
      const y = (targetTile.y + Math.random()) * Settings.TILE_SIZE;
      wander(yeti, x, y, 100, TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

export function onYetiCollision(yeti: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = Board.getEntityType(collidingEntity);
   
   // Don't damage ice spikes
   if (collidingEntityType === EntityType.iceSpikes) return;

   // Don't damage snowballs thrown by the yeti
   if (collidingEntityType === EntityType.snowball) {
      const snowballComponent = SnowballComponentArray.getComponent(collidingEntity);
      if (snowballComponent.yetiID === yeti) {
         return;
      }
   }
   
   // Don't damage yetis which haven't damaged it
   const yetiComponent = YetiComponentArray.getComponent(yeti);
   if ((collidingEntityType === EntityType.yeti || collidingEntityType === EntityType.frozenYeti) && !yetiComponent.attackingEntities.hasOwnProperty(collidingEntity)) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "yeti")) {
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(yeti);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      damageEntity(collidingEntity, yeti, 2, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 200, hitDirection);
      addLocalInvulnerabilityHash(healthComponent, "yeti", 0.3);
   }
}

export function onYetiHurt(yeti: EntityID, attackingEntity: EntityID, damage: number): void {
   const yetiComponent = YetiComponentArray.getComponent(yeti);

   const attackingEntityInfo = yetiComponent.attackingEntities[attackingEntity];
   if (typeof attackingEntityInfo !== "undefined") {
      attackingEntityInfo.remainingPursueTicks += ATTACK_PURSUE_TIME_TICKS;
      attackingEntityInfo.totalDamageDealt += damage;
   } else {
      yetiComponent.attackingEntities[attackingEntity] = {
         remainingPursueTicks: ATTACK_PURSUE_TIME_TICKS,
         totalDamageDealt: damage
      };
   }
}

export function onYetiDeath(yeti: EntityID): void {
   createItemsOverEntity(yeti, ItemType.raw_beef, randInt(4, 7), 80);
   createItemsOverEntity(yeti, ItemType.yeti_hide, randInt(2, 3), 80);
}