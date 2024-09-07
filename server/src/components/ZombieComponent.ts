import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Biome } from "webgl-test-shared/dist/tiles";
import { randFloat, TileIndex, UtilVars } from "webgl-test-shared/dist/utils";
import { moveEntityToPosition, runHerdAI, entityHasReachedPosition, stopEntity } from "../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../ai/wander-ai";
import Board from "../Board";
import { entitiesAreColliding, CollisionVars } from "../collision";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { healEntity, HealthComponentArray } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { StatusEffectComponentArray, hasStatusEffect, applyStatusEffect } from "./StatusEffectComponent";
import { TransformComponentArray } from "./TransformComponent";
import { WanderAIComponentArray } from "./WanderAIComponent";
import { calculateRadialAttackTargets } from "../entities/tribes/tribe-member";
import { entityIsStructure } from "../Entity";
import { InventoryComponentArray, getInventory } from "./InventoryComponent";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { TribeMemberComponentArray } from "./TribeMemberComponent";
import { ZombieVars } from "../entities/mobs/zombie";
import { beginSwing } from "../entities/tribes/limb-use";

const enum Vars {
   TURN_SPEED = 3 * UtilVars.PI,

   ACCELERATION = 275,
   ACCELERATION_SLOW = 150,

   /** Chance for a zombie to spontaneously combust every second */
   SPONTANEOUS_COMBUSTION_CHANCE = 0.5,

   ATTACK_OFFSET = 40,
   ATTACK_RADIUS = 30,

   // Herd AI constants
   TURN_RATE = 0.8,
   // @Speed: Don't need to calculate separation at all
   MIN_SEPARATION_DISTANCE = 0,
   SEPARATION_INFLUENCE = 0.3,
   ALIGNMENT_INFLUENCE = 0.7,
   COHESION_INFLUENCE = 0.3,

   /** The time in ticks after being hit that the zombie will move towards the source of damage */
   DAMAGE_INVESTIGATE_TIME_TICKS = (0.8 * Settings.TPS) | 0,

   HURT_ENTITY_INVESTIGATE_TICKS = (1 * Settings.TPS) | 0
}

export interface ZombieComponentParams {
   zombieType: number;
   tombstone: EntityID;
}

export class ZombieComponent {
   /** The type of the zombie, 0-3 */
   public readonly zombieType: number;
   public readonly tombstone: EntityID;

   /** Maps the IDs of entities which have attacked the zombie to the number of ticks that they should remain in the object for */
   public readonly attackingEntityIDs: Partial<Record<number, number>> = {};

   /** Cooldown before the zombie can do another attack */
   public attackCooldownTicks = 0;

   public visibleHurtEntityID = 0;
   /** Ticks since the visible hurt entity was last hit */
   public visibleHurtEntityTicks = 0;
   
   constructor(params: ZombieComponentParams) {
      this.zombieType = params.zombieType;
      this.tombstone = params.tombstone;
   }
}

export const ZombieComponentArray = new ComponentArray<ZombieComponent>(ServerComponentType.zombie, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const tribesmanIsWearingMeatSuit = (entityID: number): boolean => {
   const inventoryComponent = InventoryComponentArray.getComponent(entityID);
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot);

   const armour = armourInventory.itemSlots[1];
   return typeof armour !== "undefined" && armour.type === ItemType.meat_suit;
}

export function zombieShouldAttackEntity(zombie: EntityID, entity: EntityID): boolean {
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

const getTarget = (zombie: EntityID, aiHelperComponent: AIHelperComponent): EntityID | null => {
   const transformComponent = TransformComponentArray.getComponent(zombie);
   
   // Attack the closest target in vision range
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: EntityID | null = null;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (zombieShouldAttackEntity(zombie, entity)) {
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
   let mostRecentHitTicks = ZombieVars.CHASE_PURSUE_TIME_TICKS - Vars.DAMAGE_INVESTIGATE_TIME_TICKS - 1;
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
   const attackTargets = calculateRadialAttackTargets(zombie, Vars.ATTACK_OFFSET, Vars.ATTACK_RADIUS);

   // Register the hit
   if (attackTargets.includes(target)) {
      // @Incomplete
      // attemptAttack(zombie, target, 1, InventoryName.handSlot);
      beginSwing(zombie, 1, InventoryName.handSlot);

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

function onTick(zombieComponent: ZombieComponent, zombie: EntityID): void {
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
      if (hasStatusEffect(statusEffectComponent, StatusEffect.burning) || Math.random() < Vars.SPONTANEOUS_COMBUSTION_CHANCE / Settings.TPS) {
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
      moveEntityToPosition(zombie, targetTransformComponent.position.x, targetTransformComponent.position.y, Vars.ACCELERATION, Vars.TURN_SPEED);
      
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
         
         moveEntityToPosition(zombie, foodTransformComponent.position.x, foodTransformComponent.position.y, Vars.ACCELERATION, Vars.TURN_SPEED);

         if (entitiesAreColliding(zombie, closestFoodItem) !== CollisionVars.NO_COLLISION) {
            healEntity(zombie, 3, zombie);
            Board.destroyEntity(closestFoodItem);
         }
         return;
      }
   }

   // Investigate hurt entities
   if (zombieComponent.visibleHurtEntityTicks < Vars.HURT_ENTITY_INVESTIGATE_TICKS) {
      const hurtEntity = zombieComponent.visibleHurtEntityID;
      if (Board.hasEntity(hurtEntity)) {
         const hurtEntityTransformComponent = TransformComponentArray.getComponent(hurtEntity);
         
         moveEntityToPosition(zombie, hurtEntityTransformComponent.position.x, hurtEntityTransformComponent.position.y, Vars.ACCELERATION_SLOW, Vars.TURN_SPEED);
         return;
      }
   }

   // Don't do herd AI if the zombie was attacked recently
   if (Object.keys(zombieComponent.attackingEntityIDs).length === 0) {
      // Herd AI
      const herdMembers = findHerdMembers(aiHelperComponent.visibleEntities);
      if (herdMembers.length > 1) {
         runHerdAI(zombie, herdMembers, ZombieVars.VISION_RANGE, Vars.TURN_RATE, Vars.MIN_SEPARATION_DISTANCE, Vars.SEPARATION_INFLUENCE, Vars.ALIGNMENT_INFLUENCE, Vars.COHESION_INFLUENCE);

         const physicsComponent = PhysicsComponentArray.getComponent(zombie);
         physicsComponent.acceleration.x = Vars.ACCELERATION_SLOW * Math.sin(transformComponent.rotation);
         physicsComponent.acceleration.y = Vars.ACCELERATION_SLOW * Math.cos(transformComponent.rotation);
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
      let targetTile: TileIndex;
      do {
         targetTile = getWanderTargetTile(zombie, ZombieVars.VISION_RANGE);
      } while (++attempts <= 50 && (Board.tileIsWalls[targetTile] === 1 || Board.tileBiomes[targetTile] !== Biome.grasslands));

      const tileX = Board.getTileX(targetTile);
      const tileY = Board.getTileY(targetTile);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;
      wander(zombie, x, y, Vars.ACCELERATION_SLOW, Vars.TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const zombieComponent = ZombieComponentArray.getComponent(entity);
   packet.addNumber(zombieComponent.zombieType);
}