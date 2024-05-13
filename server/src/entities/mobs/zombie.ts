import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { STRUCTURE_TYPES, StructureType } from "webgl-test-shared/dist/structures";
import { Point, randInt, randFloat } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray, InventoryComponentArray, InventoryUseComponentArray, ItemComponentArray, TombstoneComponentArray, TribeMemberComponentArray, WanderAIComponentArray, ZombieComponentArray } from "../../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity, healEntity } from "../../components/HealthComponent";
import { ZombieComponent } from "../../components/ZombieComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { InventoryComponent, createNewInventory, dropInventory, getInventory, pickupItemEntity } from "../../components/InventoryComponent";
import Board from "../../Board";
import { StatusEffectComponent, StatusEffectComponentArray, applyStatusEffect, hasStatusEffect } from "../../components/StatusEffectComponent";
import { WanderAIComponent } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, runHerdAI, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { InventoryUseComponent, getInventoryUseInfo, hasInventoryUseInfo } from "../../components/InventoryUseComponent";
import { attemptAttack, calculateRadialAttackTargets, wasTribeMemberKill } from "../tribes/tribe-member";
import { SERVER } from "../../server";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { Biome } from "webgl-test-shared/dist/tiles";

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

const HURT_ENTITY_INVESTIGATE_TICKS= Math.floor(0.5 * Settings.TPS);

// @Cleanup: We don't need to pass the isGolden parameter, can deduce whether the tombstone is golden from the tombstoneID instead
export function createZombie(position: Point, rotation: number, isGolden: boolean, tombstoneID: number): Entity {
   const zombie = new Entity(position, rotation, EntityType.zombie, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(zombie.position.x, zombie.position.y, 1, 0, 0, HitboxCollisionType.soft, 32, zombie.getNextHitboxLocalID(), zombie.rotation);
   zombie.addHitbox(hitbox);
   
   PhysicsComponentArray.addComponent(zombie.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(zombie.id, new HealthComponent(MAX_HEALTH));
   StatusEffectComponentArray.addComponent(zombie.id, new StatusEffectComponent(0));
   ZombieComponentArray.addComponent(zombie.id, new ZombieComponent(isGolden ? 3 : randInt(0, 2), tombstoneID));
   WanderAIComponentArray.addComponent(zombie.id, new WanderAIComponent());
   AIHelperComponentArray.addComponent(zombie.id, new AIHelperComponent(VISION_RANGE));

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(zombie.id, inventoryComponent);

   const inventory = createNewInventory(inventoryComponent, InventoryName.handSlot, 1, 1, true);

   const inventoryUseComponent = new InventoryUseComponent();
   InventoryUseComponentArray.addComponent(zombie.id, inventoryUseComponent);
   inventoryUseComponent.addInventoryUseInfo(inventory);

   if (Math.random() < 0.7) {
      const offhandInventory = createNewInventory(inventoryComponent, InventoryName.offhand, 0, 0, false);
      inventoryUseComponent.addInventoryUseInfo(offhandInventory);
   }
   
   return zombie;
}

const getTarget = (zombie: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   // Attack the closest target in vision range
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (shouldAttackEntity(zombie, entity)) {
         const distance = zombie.position.calculateDistanceBetween(entity.position);
         if (distance < minDist) {
            minDist = distance;
            target = entity;
         }
      }
   }

   if (target !== null) {
      return target;
   }

   const zombieComponent = ZombieComponentArray.getComponent(zombie.id);

   // Investigate recent hits
   let mostRecentHitTicks = CHASE_PURSUE_TIME_TICKS - DAMAGE_INVESTIGATE_TIME_TICKS - 1;
   let damageSourceEntity: Entity | null = null;
   // @Speed
   for (const id of Object.keys(zombieComponent.attackingEntityIDs).map(idString => Number(idString))) {
      const hitTicks = zombieComponent.attackingEntityIDs[id]!;
      if (hitTicks > mostRecentHitTicks) {
         mostRecentHitTicks = hitTicks;
         damageSourceEntity = Board.entityRecord[id]!;
      }
   }

   return damageSourceEntity;
}

const doMeleeAttack = (zombie: Entity, target: Entity): void => {
   // Find the attack target
   const attackTargets = calculateRadialAttackTargets(zombie, ATTACK_OFFSET, ATTACK_RADIUS);

   // Register the hit
   if (attackTargets.includes(target)) {
      attemptAttack(zombie, target, 1, InventoryName.handSlot);

      // Reset attack cooldown
      const zombieComponent = ZombieComponentArray.getComponent(zombie.id);
      zombieComponent.attackCooldownTicks = Math.floor(randFloat(1, 2) * Settings.TPS);
   }
}

// @Incomplete: bite wind-up

const doBiteAttack = (zombie: Entity, target: Entity): void => {
   // Lunge at the target
   const lungeDirection = zombie.position.calculateAngleBetween(target.position);

   const physicsComponent = PhysicsComponentArray.getComponent(zombie.id);
   physicsComponent.velocity.x += 130 * Math.sin(lungeDirection);
   physicsComponent.velocity.y += 130 * Math.cos(lungeDirection);

   // Reset attack cooldown
   const zombieComponent = ZombieComponentArray.getComponent(zombie.id);
   zombieComponent.attackCooldownTicks = Math.floor(randFloat(3, 4) * Settings.TPS);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(zombie.id);
   getInventoryUseInfo(inventoryUseComponent, InventoryName.handSlot).lastAttackTicks = Board.ticks;
   if (hasInventoryUseInfo(inventoryUseComponent, InventoryName.offhand)) {
      getInventoryUseInfo(inventoryUseComponent, InventoryName.offhand).lastAttackTicks = Board.ticks;
   }
}

const doAttack = (zombie: Entity, target: Entity): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(zombie.id);

   // If holding an item, do a melee attack
   const handInventory = getInventory(inventoryComponent, InventoryName.handSlot);
   if (typeof handInventory.itemSlots[1] !== "undefined") {
      doMeleeAttack(zombie, target);
   } else {
      doBiteAttack(zombie, target);
   }
}

const findHerdMembers = (visibleEntities: ReadonlyArray<Entity>): ReadonlyArray<Entity> => {
   const herdMembers = new Array<Entity>();
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (entity.type === EntityType.zombie) {
         herdMembers.push(entity);
      }
   }
   return herdMembers;
}

export function tickZombie(zombie: Entity): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie.id);
   zombieComponent.visibleHurtEntityTicks++;

   // Update attacking entities
   // @Speed
   for (const id of Object.keys(zombieComponent.attackingEntityIDs).map(idString => Number(idString))) {
      if (typeof Board.entityRecord[id] === "undefined" || --zombieComponent.attackingEntityIDs[id]! <= 0) {
         delete zombieComponent.attackingEntityIDs[id];
      }
   }

   // If day time, ignite
   if (!Board.isNight()) {
      // Ignite randomly or stay on fire if already on fire
      const statusEffectComponent = StatusEffectComponentArray.getComponent(zombie.id);
      if (hasStatusEffect(statusEffectComponent, StatusEffect.burning) || Math.random() < SPONTANEOUS_COMBUSTION_CHANCE / Settings.TPS) {
         applyStatusEffect(zombie.id, StatusEffect.burning, 5 * Settings.TPS);
      }
   }

   const aiHelperComponent = AIHelperComponentArray.getComponent(zombie.id);

   const attackTarget = getTarget(zombie, aiHelperComponent);
   if (attackTarget !== null) {
      if (zombieComponent.attackCooldownTicks > 0) {
         zombieComponent.attackCooldownTicks--;
      } else {
         // Do special attack
         doAttack(zombie, attackTarget);
      }
      
      moveEntityToPosition(zombie, attackTarget.position.x, attackTarget.position.y, ACCELERATION, TURN_SPEED);
      
      return;
   } else {
      zombieComponent.attackCooldownTicks = Math.floor(2.5 * Settings.TPS);
   }

   // Eat raw beef and fish
   {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestFoodItem: Entity | null = null;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entity.type !== EntityType.itemEntity) {
            continue;
         }

         const itemComponent = ItemComponentArray.getComponent(entity.id);
         if (itemComponent.itemType === ItemType.raw_beef || itemComponent.itemType === ItemType.raw_fish) {
            const distance = zombie.position.calculateDistanceBetween(entity.position);
            if (distance < minDist) {
               minDist = distance;
               closestFoodItem = entity;
            }
         }
      }
      if (closestFoodItem !== null) {
         moveEntityToPosition(zombie, closestFoodItem.position.x, closestFoodItem.position.y, ACCELERATION, TURN_SPEED);

         if (entitiesAreColliding(zombie, closestFoodItem) !== CollisionVars.NO_COLLISION) {
            healEntity(zombie, 3, zombie.id);
            closestFoodItem.destroy();
         }
         return;
      }
   }

   // Investigate hurt entities
   if (zombieComponent.visibleHurtEntityTicks < HURT_ENTITY_INVESTIGATE_TICKS) {
      const hurtEntity = Board.entityRecord[zombieComponent.visibleHurtEntityID];
      if (typeof hurtEntity !== "undefined") {
         moveEntityToPosition(zombie, hurtEntity.position.x, hurtEntity.position.y, ACCELERATION_SLOW, TURN_SPEED);
         return;
      }
   }

   // Don't do herd AI if the zombie was attacked recently
   if (Object.keys(zombieComponent.attackingEntityIDs).length === 0) {
      // Herd AI
      const herdMembers = findHerdMembers(aiHelperComponent.visibleEntities);
      if (herdMembers.length > 1) {
         runHerdAI(zombie, herdMembers, VISION_RANGE, TURN_RATE, MIN_SEPARATION_DISTANCE, SEPARATION_INFLUENCE, ALIGNMENT_INFLUENCE, COHESION_INFLUENCE);

         const physicsComponent = PhysicsComponentArray.getComponent(zombie.id);
         physicsComponent.acceleration.x = ACCELERATION_SLOW * Math.sin(zombie.rotation);
         physicsComponent.acceleration.y = ACCELERATION_SLOW * Math.cos(zombie.rotation);
         return;
      }
   }

   // Wander AI
   const physicsComponent = PhysicsComponentArray.getComponent(zombie.id);
   const wanderAIComponent = WanderAIComponentArray.getComponent(zombie.id);
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
   return typeof armour === "undefined" || armour.type === ItemType.meat_suit;
}

const shouldAttackEntity = (zombie: Entity, entity: Entity): boolean => {
   if (!HealthComponentArray.hasComponent(entity.id)) {
      return false;
   }
   
   // If the entity is attacking the zombie, attack back
   const zombieComponent = ZombieComponentArray.getComponent(zombie.id);
   if (typeof zombieComponent.attackingEntityIDs[entity.id] !== "undefined") {
      return true;
   }

   // Attack tribe members, but only if they aren't wearing a meat suit
   if (TribeMemberComponentArray.hasComponent(entity.id) && !tribesmanIsWearingMeatSuit(entity.id)) {
      return true;
   }

   return STRUCTURE_TYPES.indexOf(entity.type as StructureType) !== -1;
}

const shouldHurtEntity = (zombie: Entity, entity: Entity): boolean => {
   if (!HealthComponentArray.hasComponent(entity.id)) {
      return false;
   }

   // If the entity is attacking the zombie, attack back
   const zombieComponent = ZombieComponentArray.getComponent(zombie.id);
   if (zombieComponent.attackingEntityIDs.hasOwnProperty(entity.id)) {
      return true;
   }

   // Attack tribe members, but only if they aren't wearing a meat suit
   if (TribeMemberComponentArray.hasComponent(entity.id) && !tribesmanIsWearingMeatSuit(entity.id)) {
      return true;
   }

   return STRUCTURE_TYPES.includes(entity.type as StructureType);
}

export function onZombieCollision(zombie: Entity, collidingEntity: Entity): void {
   // Pick up item entities
   if (collidingEntity.type === EntityType.itemEntity) {
      pickupItemEntity(zombie, collidingEntity);
   }
   
   // Hurt enemies on collision
   if (!shouldHurtEntity(zombie, collidingEntity)) {
      return;
   }
   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "zombie")) {
      return;
   }

   const hitDirection = zombie.position.calculateAngleBetween(collidingEntity.position);

   // Damage and knock back the player
   damageEntity(collidingEntity, 1, zombie, PlayerCauseOfDeath.zombie, "zombie");
   applyKnockback(collidingEntity, 150, hitDirection);
   SERVER.registerEntityHit({
      entityPositionX: collidingEntity.position.x,
      entityPositionY: collidingEntity.position.y,
      hitEntityID: collidingEntity.id,
      damage: 1,
      knockback: 150,
      angleFromAttacker: hitDirection,
      attackerID: zombie.id,
      flags: 0
   });
   addLocalInvulnerabilityHash(healthComponent, "zombie", 0.3);

   // Push the zombie away from the entity
   const flinchDirection = hitDirection + Math.PI;
   const physicsComponent = PhysicsComponentArray.getComponent(zombie.id);
   physicsComponent.velocity.x += 100 * Math.sin(flinchDirection);
   physicsComponent.velocity.y += 100 * Math.cos(flinchDirection);
}

export function onZombieHurt(zombie: Entity, attackingEntity: Entity): void {
   if (HealthComponentArray.hasComponent(attackingEntity.id) && attackingEntity.type !== EntityType.iceSpikes && attackingEntity.type !== EntityType.cactus && attackingEntity.type !== EntityType.floorSpikes && attackingEntity.type !== EntityType.wallSpikes && attackingEntity.type !== EntityType.floorPunjiSticks && attackingEntity.type !== EntityType.wallPunjiSticks) {
      const zombieComponent = ZombieComponentArray.getComponent(zombie.id);
      zombieComponent.attackingEntityIDs[attackingEntity.id] = CHASE_PURSUE_TIME_TICKS;
   }
}

export function onZombieDeath(zombie: Entity): void {
   const inventoryComponent = InventoryComponentArray.getComponent(zombie.id);
   dropInventory(zombie, inventoryComponent, InventoryName.handSlot, 38);

   const zombieComponent = ZombieComponentArray.getComponent(zombie.id);
   if (zombieComponent.tombstoneID !== 0 && TombstoneComponentArray.hasComponent(zombieComponent.tombstoneID)) {
      const tombstoneComponent = TombstoneComponentArray.getComponent(zombieComponent.tombstoneID);
      tombstoneComponent.numZombies--;
   }

   if (wasTribeMemberKill(zombie) && Math.random() < 0.1) {
      createItemsOverEntity(zombie, ItemType.eyeball, 1, 40);
   }
}

export function onZombieVisibleEntityHurt(zombie: Entity, hurtEntity: Entity): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie.id);

   zombieComponent.visibleHurtEntityID = hurtEntity.id;
   zombieComponent.visibleHurtEntityTicks = 0;
}