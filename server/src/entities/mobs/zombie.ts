import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randInt, randFloat } from "webgl-test-shared/dist/utils";
import { entityIsStructure } from "../../Entity";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity, healEntity } from "../../components/HealthComponent";
import { ZombieComponentArray } from "../../components/ZombieComponent";
import { InventoryComponentArray, InventoryCreationInfo, getInventory, pickupItemEntity } from "../../components/InventoryComponent";
import Board from "../../Board";
import { StatusEffectComponentArray, applyStatusEffect, hasStatusEffect } from "../../components/StatusEffectComponent";
import { WanderAIComponentArray } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, runHerdAI, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { attemptAttack, calculateRadialAttackTargets, wasTribeMemberKill } from "../tribes/tribe-member";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { Biome } from "webgl-test-shared/dist/tiles";
import { TribeMemberComponentArray } from "../../components/TribeMemberComponent";
import { ItemComponentArray } from "../../components/ItemComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { TombstoneComponentArray } from "../../components/TombstoneComponent";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items/items";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.zombie
   | ServerComponentType.wanderAI
   | ServerComponentType.aiHelper
   | ServerComponentType.inventory
   | ServerComponentType.inventoryUse;

const TURN_SPEED = 3 * Math.PI;

const MAX_HEALTH = 20;

const VISION_RANGE = 375;

const ACCELERATION = 275;
const ACCELERATION_SLOW = 150;

const CHASE_PURSUE_TIME_TICKS = 5 * Settings.TPS;

/** Chance for a zombie to spontaneously combust every second */
const SPONTANEOUS_COMBUSTION_CHANCE = 0.5;

const ATTACK_OFFSET = 40;
const ATTACK_RADIUS = 30;

// Herd AI constants
const TURN_RATE = 0.8;
const MIN_SEPARATION_DISTANCE = 0; // @Speed: Don't need to calculate separation at all
const SEPARATION_INFLUENCE = 0.3;
const ALIGNMENT_INFLUENCE = 0.7;
const COHESION_INFLUENCE = 0.3;

/** The time in ticks after being hit that the zombie will move towards the source of damage */
const DAMAGE_INVESTIGATE_TIME_TICKS = Math.floor(0.8 * Settings.TPS);

const HURT_ENTITY_INVESTIGATE_TICKS = Math.floor(1 * Settings.TPS);

export function createZombieConfig(): ComponentConfig<ComponentTypes> {
   const inventories = new Array<InventoryCreationInfo>();
   const usedInventoryNames = new Array<InventoryName>();

   inventories.push({
      inventoryName: InventoryName.handSlot,
      width: 1,
      height: 1,
      options: { acceptsPickedUpItems: true, isDroppedOnDeath: true },
      items: []
   });

   if (Math.random() < 0.7) {
      usedInventoryNames.push(InventoryName.offhand);
      inventories.push({
         inventoryName: InventoryName.offhand,
         width: 0,
         height: 0,
         options: { acceptsPickedUpItems: true, isDroppedOnDeath: true },
         items: []
      });
   }
   
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.zombie,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 32)]
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
         maxHealth: MAX_HEALTH
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.zombie]: {
         zombieType: randInt(0, 2),
         tombstone: 0
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.aiHelper]: {
         visionRange: VISION_RANGE
      },
      [ServerComponentType.inventory]: {
         inventories: [
         ]
      },
      [ServerComponentType.inventoryUse]: {
         usedInventoryNames: usedInventoryNames
      }
   };
}

const getTarget = (zombie: EntityID, aiHelperComponent: AIHelperComponent): EntityID | null => {
   const transformComponent = TransformComponentArray.getComponent(zombie);
   
   // Attack the closest target in vision range
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: EntityID | null = null;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (shouldAttackEntity(zombie, entity)) {
         const entityTransformComponent = TransformComponentArray.getComponent(entity);
         
         const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
         if (distance < minDist) {
            minDist = distance;
            target = entity;
         }
      }
   }

   if (target !== null) {
      return target;
   }

   const zombieComponent = ZombieComponentArray.getComponent(zombie);

   // Investigate recent hits
   let mostRecentHitTicks = CHASE_PURSUE_TIME_TICKS - DAMAGE_INVESTIGATE_TIME_TICKS - 1;
   let damageSourceEntity: EntityID | null = null;
   // @Speed
   for (const attackingEntity of Object.keys(zombieComponent.attackingEntityIDs).map(idString => Number(idString))) {
      const hitTicks = zombieComponent.attackingEntityIDs[attackingEntity]!;
      if (hitTicks > mostRecentHitTicks) {
         mostRecentHitTicks = hitTicks;
         damageSourceEntity = attackingEntity;
      }
   }

   return damageSourceEntity;
}

const doMeleeAttack = (zombie: EntityID, target: EntityID): void => {
   // Find the attack target
   const attackTargets = calculateRadialAttackTargets(zombie, ATTACK_OFFSET, ATTACK_RADIUS);

   // Register the hit
   if (attackTargets.includes(target)) {
      attemptAttack(zombie, target, 1, InventoryName.handSlot);

      // Reset attack cooldown
      const zombieComponent = ZombieComponentArray.getComponent(zombie);
      zombieComponent.attackCooldownTicks = Math.floor(randFloat(1, 2) * Settings.TPS);
   }
}

// @Incomplete: bite wind-up

const doBiteAttack = (zombie: EntityID, target: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(zombie);
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   
   // Lunge at the target
   const lungeDirection = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);

   const physicsComponent = PhysicsComponentArray.getComponent(zombie);
   physicsComponent.velocity.x += 130 * Math.sin(lungeDirection);
   physicsComponent.velocity.y += 130 * Math.cos(lungeDirection);

   // Reset attack cooldown
   const zombieComponent = ZombieComponentArray.getComponent(zombie);
   zombieComponent.attackCooldownTicks = Math.floor(randFloat(3, 4) * Settings.TPS);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(zombie);

   const mainHandUseInfo = inventoryUseComponent.getUseInfo(InventoryName.handSlot);
   mainHandUseInfo.lastAttackTicks = Board.ticks;

   if (inventoryUseComponent.hasUseInfo(InventoryName.offhand)) {
      const offhandUseInfo = inventoryUseComponent.getUseInfo(InventoryName.offhand);
      offhandUseInfo.lastAttackTicks = Board.ticks;
   }
}

const doAttack = (zombie: EntityID, target: EntityID): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(zombie);

   // If holding an item, do a melee attack
   const handInventory = getInventory(inventoryComponent, InventoryName.handSlot);
   if (typeof handInventory.itemSlots[1] !== "undefined") {
      doMeleeAttack(zombie, target);
   } else {
      doBiteAttack(zombie, target);
   }
}

const findHerdMembers = (visibleEntities: ReadonlyArray<EntityID>): ReadonlyArray<EntityID> => {
   const herdMembers = new Array<EntityID>();
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (Board.getEntityType(entity) === EntityType.zombie) {
         herdMembers.push(entity);
      }
   }
   return herdMembers;
}

export function tickZombie(zombie: EntityID): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);
   zombieComponent.visibleHurtEntityTicks++;

   // Update attacking entities
   // @Speed
   for (const attackingEntity of Object.keys(zombieComponent.attackingEntityIDs).map(idString => Number(idString))) {
      if (!Board.hasEntity(attackingEntity) || --zombieComponent.attackingEntityIDs[attackingEntity]! <= 0) {
         delete zombieComponent.attackingEntityIDs[attackingEntity];
      }
   }

   // If day time, ignite
   if (!Board.isNight()) {
      // Ignite randomly or stay on fire if already on fire
      const statusEffectComponent = StatusEffectComponentArray.getComponent(zombie);
      if (hasStatusEffect(statusEffectComponent, StatusEffect.burning) || Math.random() < SPONTANEOUS_COMBUSTION_CHANCE / Settings.TPS) {
         applyStatusEffect(zombie, StatusEffect.burning, 5 * Settings.TPS);
      }
   }

   const aiHelperComponent = AIHelperComponentArray.getComponent(zombie);

   const attackTarget = getTarget(zombie, aiHelperComponent);
   if (attackTarget !== null) {
      if (zombieComponent.attackCooldownTicks > 0) {
         zombieComponent.attackCooldownTicks--;
      } else {
         // Do special attack
         doAttack(zombie, attackTarget);
      }
      
      const targetTransformComponent = TransformComponentArray.getComponent(attackTarget);
      moveEntityToPosition(zombie, targetTransformComponent.position.x, targetTransformComponent.position.y, ACCELERATION, TURN_SPEED);
      
      return;
   } else {
      zombieComponent.attackCooldownTicks = Math.floor(2.5 * Settings.TPS);
   }

   const transformComponent = TransformComponentArray.getComponent(zombie);

   // Eat raw beef and fish
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
         
         moveEntityToPosition(zombie, foodTransformComponent.position.x, foodTransformComponent.position.y, ACCELERATION, TURN_SPEED);

         if (entitiesAreColliding(zombie, closestFoodItem) !== CollisionVars.NO_COLLISION) {
            healEntity(zombie, 3, zombie);
            Board.destroyEntity(closestFoodItem);
         }
         return;
      }
   }

   // Investigate hurt entities
   if (zombieComponent.visibleHurtEntityTicks < HURT_ENTITY_INVESTIGATE_TICKS) {
      const hurtEntity = zombieComponent.visibleHurtEntityID;
      if (Board.hasEntity(hurtEntity)) {
         const hurtEntityTransformComponent = TransformComponentArray.getComponent(hurtEntity);
         
         moveEntityToPosition(zombie, hurtEntityTransformComponent.position.x, hurtEntityTransformComponent.position.y, ACCELERATION_SLOW, TURN_SPEED);
         return;
      }
   }

   // Don't do herd AI if the zombie was attacked recently
   if (Object.keys(zombieComponent.attackingEntityIDs).length === 0) {
      // Herd AI
      const herdMembers = findHerdMembers(aiHelperComponent.visibleEntities);
      if (herdMembers.length > 1) {
         runHerdAI(zombie, herdMembers, VISION_RANGE, TURN_RATE, MIN_SEPARATION_DISTANCE, SEPARATION_INFLUENCE, ALIGNMENT_INFLUENCE, COHESION_INFLUENCE);

         const physicsComponent = PhysicsComponentArray.getComponent(zombie);
         physicsComponent.acceleration.x = ACCELERATION_SLOW * Math.sin(transformComponent.rotation);
         physicsComponent.acceleration.y = ACCELERATION_SLOW * Math.cos(transformComponent.rotation);
         return;
      }
   }

   // Wander AI
   const physicsComponent = PhysicsComponentArray.getComponent(zombie);
   const wanderAIComponent = WanderAIComponentArray.getComponent(zombie);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(zombie, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.4)) {
      let attempts = 0;
      let targetTile: Tile;
      do {
         targetTile = getWanderTargetTile(zombie, VISION_RANGE);
      } while (++attempts <= 50 && (targetTile.isWall || targetTile.biome !== Biome.grasslands));

      const x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
      const y = (targetTile.y + Math.random()) * Settings.TILE_SIZE;
      wander(zombie, x, y, ACCELERATION_SLOW, TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

const tribesmanIsWearingMeatSuit = (entityID: number): boolean => {
   const inventoryComponent = InventoryComponentArray.getComponent(entityID);
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot);

   const armour = armourInventory.itemSlots[1];
   return typeof armour !== "undefined" && armour.type === ItemType.meat_suit;
}

const shouldAttackEntity = (zombie: EntityID, entity: EntityID): boolean => {
   if (!HealthComponentArray.hasComponent(entity)) {
      return false;
   }
   
   // If the entity is attacking the zombie, attack back
   const zombieComponent = ZombieComponentArray.getComponent(zombie);
   if (typeof zombieComponent.attackingEntityIDs[entity] !== "undefined") {
      return true;
   }

   // Attack tribe members, but only if they aren't wearing a meat suit
   if (TribeMemberComponentArray.hasComponent(entity) && !tribesmanIsWearingMeatSuit(entity)) {
      return true;
   }

   return entityIsStructure(entity);
}

export function onZombieCollision(zombie: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // Pick up item entities
   if (Board.getEntityType(collidingEntity) === EntityType.itemEntity) {
      pickupItemEntity(zombie, collidingEntity);
      return;
   }
   
   if (!shouldAttackEntity(zombie, collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "zombie")) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(zombie);
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

   const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

   // Damage and knock back the player
   damageEntity(collidingEntity, zombie, 1, PlayerCauseOfDeath.zombie, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 150, hitDirection);
   addLocalInvulnerabilityHash(healthComponent, "zombie", 0.3);

   // Push the zombie away from the entity
   const flinchDirection = hitDirection + Math.PI;
   const physicsComponent = PhysicsComponentArray.getComponent(zombie);
   physicsComponent.velocity.x += 100 * Math.sin(flinchDirection);
   physicsComponent.velocity.y += 100 * Math.cos(flinchDirection);
}

export function onZombieHurt(zombie: EntityID, attackingEntity: EntityID): void {
   // @Cleanup: too many ifs. generalise
   const attackingEntityType = Board.getEntityType(attackingEntity);
   if (HealthComponentArray.hasComponent(attackingEntity) && attackingEntityType !== EntityType.iceSpikes && attackingEntityType !== EntityType.cactus && attackingEntityType !== EntityType.floorSpikes && attackingEntityType !== EntityType.wallSpikes && attackingEntityType !== EntityType.floorPunjiSticks && attackingEntityType !== EntityType.wallPunjiSticks) {
      const zombieComponent = ZombieComponentArray.getComponent(zombie);
      zombieComponent.attackingEntityIDs[attackingEntity] = CHASE_PURSUE_TIME_TICKS;
   }
}

export function onZombieDeath(zombie: EntityID): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);
   if (zombieComponent.tombstone !== 0 && TombstoneComponentArray.hasComponent(zombieComponent.tombstone)) {
      const tombstoneComponent = TombstoneComponentArray.getComponent(zombieComponent.tombstone);
      tombstoneComponent.numZombies--;
   }

   if (wasTribeMemberKill(zombie) && Math.random() < 0.1) {
      createItemsOverEntity(zombie, ItemType.eyeball, 1, 40);
   }
}

export function onZombieVisibleEntityHurt(zombie: EntityID, hurtEntity: EntityID): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);

   zombieComponent.visibleHurtEntityID = hurtEntity;
   zombieComponent.visibleHurtEntityTicks = 0;
}