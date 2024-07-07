import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { SlimeSize, EntityType, PlayerCauseOfDeath, EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { Point, lerp, randInt } from "webgl-test-shared/dist/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity, getEntityHealth, healEntity } from "../../components/HealthComponent";
import { SlimeComponent, SlimeComponentArray } from "../../components/SlimeComponent";
import { entityHasReachedPosition, getEntitiesInRange, stopEntity, turnAngle } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { WanderAIComponentArray } from "../../components/WanderAIComponent";
import { createItemsOverEntity } from "../../entity-shared";
import Board from "../../Board";
import { AIHelperComponentArray } from "../../components/AIHelperComponent";
import { PhysicsComponentArray } from "../../components/PhysicsComponent";
import { wasTribeMemberKill } from "../tribes/tribe-member";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { CraftingStation } from "webgl-test-shared/dist/items/crafting-recipes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createSlimeSpitConfig } from "../projectiles/slime-spit";
import { createEntityFromConfig } from "../../Entity";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.wanderAI
   | ServerComponentType.aiHelper
   | ServerComponentType.slime
   | ServerComponentType.craftingStation;

const TURN_SPEED = 2 * Math.PI;

export const SLIME_RADII: ReadonlyArray<number> = [32, 44, 60];
const CONTACT_DAMAGE: ReadonlyArray<number> = [1, 2, 3];
const SPEED_MULTIPLIERS: ReadonlyArray<number> = [2.5, 1.75, 1];
export const SLIME_MERGE_WEIGHTS: ReadonlyArray<number> = [2, 5, 11];
const SLIME_DROP_AMOUNTS: ReadonlyArray<[minDropAmount: number, maxDropAmount: number]> = [
   [1, 2], // small slime
   [3, 5], // medium slime
   [6, 9] // large slime
];
const MAX_MERGE_WANT: ReadonlyArray<number> = [15 * Settings.TPS, 40 * Settings.TPS, 75 * Settings.TPS];

export const SLIME_VISION_RANGES = [200, 250, 300];

const ACCELERATION = 150;

export const SLIME_MERGE_TIME = 7.5;

const ANGER_DIFFUSE_MULTIPLIER = 0.15;
const MAX_ANGER_PROPAGATION_CHAIN_LENGTH = 5;
// @Incomplete?
const MAX_ENTITIES_IN_RANGE_FOR_MERGE = 7;

const HEALING_ON_SLIME_PER_SECOND = 0.5;
const HEALING_PROC_INTERVAL = 0.1;

export const SPIT_COOLDOWN_TICKS = 4 * Settings.TPS;
export const SPIT_CHARGE_TIME_TICKS = SPIT_COOLDOWN_TICKS + Math.floor(0.8 * Settings.TPS);

export interface SlimeEntityAnger {
   angerAmount: number;
   readonly target: EntityID;
}

interface AngerPropagationInfo {
   chainLength: number;
   readonly propagatedEntityIDs: Set<number>;
}

export function createSlimeConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.slime,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(0, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 0)]
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
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.aiHelper]: {
         visionRange: 0
      },
      [ServerComponentType.slime]: {
         size: 0,
         mergeWeight: 0,
         orbSizes: []
      },
      [ServerComponentType.craftingStation]: {
         craftingStation: CraftingStation.slime
      }
   };
}

const updateAngerTarget = (slime: EntityID): EntityID | null => {
   const slimeComponent = SlimeComponentArray.getComponent(slime);

   // Target the entity which the slime is angry with the most
   let maxAnger = 0;
   let target: EntityID;
   for (let i = 0; i < slimeComponent.angeredEntities.length; i++) {
      const angerInfo = slimeComponent.angeredEntities[i];

      // Remove anger at an entity if the entity is dead
      if (!Board.hasEntity(angerInfo.target)) {
         slimeComponent.angeredEntities.splice(i, 1);
         i--;
         continue;
      }

      // Decrease anger
      angerInfo.angerAmount -= Settings.I_TPS * ANGER_DIFFUSE_MULTIPLIER;
      if (angerInfo.angerAmount <= 0) {
         slimeComponent.angeredEntities.splice(i, 1);
         i--;
         continue;
      }
      
      if (angerInfo.angerAmount > maxAnger) {
         maxAnger = angerInfo.angerAmount;
         target = angerInfo.target;
      }
   }

   if (maxAnger === 0) {
      return null;
   }
   
   return target!;
}

/**
 * Determines whether the slime wants to merge with the other slime.
 */
const wantsToMerge = (slimeComponent1: SlimeComponent, slime2: EntityID): boolean => {
   const slimeComponent2 = SlimeComponentArray.getComponent(slime2);
   
   // Don't try to merge with larger slimes
   if (slimeComponent1.size > slimeComponent2.size) return false;

   const mergeWant = Board.ticks - slimeComponent1.lastMergeTicks;
   return mergeWant >= MAX_MERGE_WANT[slimeComponent1.size];
}

const createSpit = (slime: EntityID, slimeComponent: SlimeComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const x = transformComponent.position.x + SLIME_RADII[slimeComponent.size] * Math.sin(transformComponent.rotation);
   const y = transformComponent.position.y + SLIME_RADII[slimeComponent.size] * Math.cos(transformComponent.rotation);

   const config = createSlimeSpitConfig();
   config[ServerComponentType.transform].position.x = x;
   config[ServerComponentType.transform].position.y = y;
   config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config[ServerComponentType.physics].velocityX = 500 * Math.sin(transformComponent.rotation);
   config[ServerComponentType.physics].velocityY = 500 * Math.cos(transformComponent.rotation);
   config[ServerComponentType.slimeSpit].size = slimeComponent.size === SlimeSize.large ? 1 : 0;
   createEntityFromConfig(config);
}

// @Incomplete @Speed: Figure out why this first faster function seemingly gets called way less than the second one

const getEnemyChaseTargetID = (slime: EntityID): number => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestEnemyID = 0;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      
      const entityType = Board.getEntityType(entity);
      if (entityType === EntityType.slime || entityType === EntityType.slimewisp || transformComponent.tile.biome !== Biome.swamp || !HealthComponentArray.hasComponent(entity)) {
         continue;
      }

      const distanceSquared = transformComponent.position.calculateDistanceSquaredBetween(entityTransformComponent.position);
      if (distanceSquared < minDist) {
         minDist = distanceSquared;
         closestEnemyID = entity;
      }
   }

   return closestEnemyID;
}

const getChaseTargetID = (slime: EntityID): number => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestEnemyID = 0;
   let closestMergerID = 0;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      const otherTransformComponent = TransformComponentArray.getComponent(entity);

      if (Board.getEntityType(entity) === EntityType.slime) {
         // Don't try to merge with larger slimes
         const otherSlimeComponent = SlimeComponentArray.getComponent(entity);
         if (!slimeWantsToMerge(otherSlimeComponent)) {
            continue;
         }

         const distanceSquared = transformComponent.position.calculateDistanceSquaredBetween(otherTransformComponent.position);
         if (distanceSquared < minDist) {
            minDist = distanceSquared;
            closestMergerID = entity;
         }
      } else {
         if (Board.getEntityType(entity) === EntityType.slimewisp || otherTransformComponent.tile.biome !== Biome.swamp || !HealthComponentArray.hasComponent(entity)) {
            continue;
         }

         const distanceSquared = transformComponent.position.calculateDistanceSquaredBetween(otherTransformComponent.position);
         if (distanceSquared < minDist) {
            minDist = distanceSquared;
            closestEnemyID = entity;
         }
      }
   }

   if (closestEnemyID !== 0) {
      return closestEnemyID;
   }
   return closestMergerID;
}

const slimeWantsToMerge = (slimeComponent: SlimeComponent): boolean => {
   const mergeWant = Board.ticks - slimeComponent.lastMergeTicks;
   return mergeWant >= MAX_MERGE_WANT[slimeComponent.size];
}

export function tickSlime(slime: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(slime);
   
   // Slimes move at normal speed on slime and sludge blocks
   const physicsComponent = PhysicsComponentArray.getComponent(slime);
   physicsComponent.overrideMoveSpeedMultiplier = transformComponent.tile.type === TileType.slime || transformComponent.tile.type === TileType.sludge;

   const slimeComponent = SlimeComponentArray.getComponent(slime);

   // Heal when standing on slime blocks
   if (transformComponent.tile.type === TileType.slime) {
      if (Board.tickIntervalHasPassed(HEALING_PROC_INTERVAL)) {
         healEntity(slime, HEALING_ON_SLIME_PER_SECOND * HEALING_PROC_INTERVAL, slime);
      }
   }

   // Attack entities the slime is angry at
   const angerTarget = updateAngerTarget(slime);
   if (angerTarget !== null) {
      const angerTargetTransformComponent = TransformComponentArray.getComponent(angerTarget);
      
      const targetDirection = transformComponent.position.calculateAngleBetween(angerTargetTransformComponent.position);
      slimeComponent.eyeRotation = turnAngle(slimeComponent.eyeRotation, targetDirection, 5 * Math.PI);

      physicsComponent.targetRotation = targetDirection;
      physicsComponent.turnSpeed = TURN_SPEED;

      if (slimeComponent.size > SlimeSize.small) {
         // If it has been more than one tick since the slime has been angry, reset the charge progress
         if (slimeComponent.lastSpitTicks < Board.ticks - 1) {
            slimeComponent.spitChargeTicks = 0;
         }
         slimeComponent.lastSpitTicks = Board.ticks;
         
         slimeComponent.spitChargeTicks++;
         if (slimeComponent.spitChargeTicks >= SPIT_COOLDOWN_TICKS) {
            stopEntity(physicsComponent);
            
            // Spit attack
            if (slimeComponent.spitChargeTicks >= SPIT_CHARGE_TIME_TICKS) {
               createSpit(slime, slimeComponent);
               slimeComponent.spitChargeTicks = 0;
            }
            return;
         }
      }

      const speedMultiplier = SPEED_MULTIPLIERS[slimeComponent.size];
      physicsComponent.acceleration.x = ACCELERATION * speedMultiplier * Math.sin(transformComponent.rotation);
      physicsComponent.acceleration.y = ACCELERATION * speedMultiplier * Math.cos(transformComponent.rotation);
      return;
   }

   // If the slime wants to merge, do a search for both merge and enemy targets. Otherwise only look for enemy targets
   let chaseTarget: number;
   if (slimeWantsToMerge(slimeComponent)) {
      // Chase enemies and merge targets
      chaseTarget = getChaseTargetID(slime);
   } else {
      // Chase enemies
      chaseTarget = getEnemyChaseTargetID(slime);
   }
   if (chaseTarget !== 0) {
      const chaseTargetTransformComponent = TransformComponentArray.getComponent(chaseTarget);
      
      const targetDirection = transformComponent.position.calculateAngleBetween(chaseTargetTransformComponent.position);
      slimeComponent.eyeRotation = turnAngle(slimeComponent.eyeRotation, targetDirection, 5 * Math.PI);

      const speedMultiplier = SPEED_MULTIPLIERS[slimeComponent.size];
      physicsComponent.acceleration.x = ACCELERATION * speedMultiplier * Math.sin(transformComponent.rotation);
      physicsComponent.acceleration.y = ACCELERATION * speedMultiplier * Math.cos(transformComponent.rotation);

      physicsComponent.targetRotation = targetDirection;
      physicsComponent.turnSpeed = TURN_SPEED;
      return;
   }

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(slime);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(slime, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.5)) {
      const visionRange = SLIME_VISION_RANGES[slimeComponent.size];

      let attempts = 0;
      let targetTile: Tile;
      do {
         targetTile = getWanderTargetTile(slime, visionRange);
      } while (++attempts <= 50 && (targetTile.isWall || targetTile.biome !== Biome.swamp));

      const x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
      const y = (targetTile.y + Math.random()) * Settings.TILE_SIZE;
      const speedMultiplier = SPEED_MULTIPLIERS[slimeComponent.size];
      wander(slime, x, y, ACCELERATION * speedMultiplier, TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

const merge = (slime1: EntityID, slime2: EntityID): void => {
   // Prevents both slimes fromj calling this function
   if (Board.entityIsFlaggedForDestruction(slime2)) return;

   const slimeComponent1 = SlimeComponentArray.getComponent(slime1);
   const slimeComponent2 = SlimeComponentArray.getComponent(slime2);
   slimeComponent1.mergeWeight += slimeComponent2.mergeWeight;

   slimeComponent1.mergeTimer = SLIME_MERGE_TIME;

   if (slimeComponent1.size < SlimeSize.large && slimeComponent1.mergeWeight >= SLIME_MERGE_WEIGHTS[slimeComponent1.size + 1]) {
      const orbSizes = new Array<SlimeSize>();

      // Add orbs from the 2 existing slimes
      for (const orbSize of slimeComponent1.orbSizes) {
         orbSizes.push(orbSize);
      }
      for (const orbSize of slimeComponent2.orbSizes) {
         orbSizes.push(orbSize);
      }

      // @Incomplete: Why do we do this for both?
      orbSizes.push(slimeComponent1.size);
      orbSizes.push(slimeComponent2.size);
      
      const slime1TransformComponent = TransformComponentArray.getComponent(slime1);
      const slime2TransformComponent = TransformComponentArray.getComponent(slime2);
      
      const config = createSlimeConfig();
      config[ServerComponentType.transform].position.x = (slime1TransformComponent.position.x + slime2TransformComponent.position.x) / 2;
      config[ServerComponentType.transform].position.y = (slime1TransformComponent.position.y + slime2TransformComponent.position.y) / 2;
      config[ServerComponentType.slime].size = slimeComponent1.size + 1;
      config[ServerComponentType.slime].orbSizes = orbSizes;
      createEntityFromConfig(config);
      
      Board.destroyEntity(slime1);
   } else {
      // @Incomplete: This allows small slimes to eat larger slimes. Very bad.
      
      // Add the other slime's health
      healEntity(slime1, getEntityHealth(slime2), slime1)

      slimeComponent1.orbSizes.push(slimeComponent2.size);

      slimeComponent1.lastMergeTicks = Board.ticks;
   }
   
   Board.destroyEntity(slime2);
}

export function onSlimeCollision(slime: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = Board.getEntityType(collidingEntity);
   
   // Merge with slimes
   if (collidingEntityType === EntityType.slime) {
      const slimeComponent = SlimeComponentArray.getComponent(slime);
      if (wantsToMerge(slimeComponent, collidingEntity)) {
         slimeComponent.mergeTimer -= Settings.I_TPS;
         if (slimeComponent.mergeTimer <= 0) {
            merge(slime, collidingEntity);
         }
      }
      return;
   }
   
   if (collidingEntityType === EntityType.slimewisp) return;
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "slime")) {
         return;
      }

      const slimeComponent = SlimeComponentArray.getComponent(slime);
      const damage = CONTACT_DAMAGE[slimeComponent.size];

      damageEntity(collidingEntity, slime, damage, PlayerCauseOfDeath.slime, AttackEffectiveness.effective, collisionPoint, 0);
      addLocalInvulnerabilityHash(healthComponent, "slime", 0.3);
   }
}

const addEntityAnger = (slime: EntityID, entity: EntityID, amount: number, propagationInfo: AngerPropagationInfo): void => {
   const slimeComponent = SlimeComponentArray.getComponent(slime);

   let alreadyIsAngry = false;
   for (const entityAnger of slimeComponent.angeredEntities) {
      if (entityAnger.target === entity) {
         const angerOverflow = Math.max(entityAnger.angerAmount + amount - 1, 0);

         entityAnger.angerAmount = Math.min(entityAnger.angerAmount + amount, 1);

         if (angerOverflow > 0) {
            propagateAnger(slime, entity, angerOverflow, propagationInfo);
         }

         alreadyIsAngry = true;
         break;
      }
   }

   if (!alreadyIsAngry) {
      slimeComponent.angeredEntities.push({
         angerAmount: amount,
         target: entity
      });
   }
}

const propagateAnger = (slime: EntityID, angeredEntity: EntityID, amount: number, propagationInfo: AngerPropagationInfo = { chainLength: 0, propagatedEntityIDs: new Set() }): void => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const slimeComponent = SlimeComponentArray.getComponent(slime);

   const visionRange = SLIME_VISION_RANGES[slimeComponent.size];
   // @Speed
   const visibleEntities = getEntitiesInRange(transformComponent.position.x, transformComponent.position.y, visionRange);

   // @Cleanup: don't do here
   let idx = visibleEntities.indexOf(slime);
   while (idx !== -1) {
      visibleEntities.splice(idx, 1);
      idx = visibleEntities.indexOf(slime);
   }
   
   // Propagate the anger
   for (const entity of visibleEntities) {
      if (Board.getEntityType(entity) === EntityType.slime && !propagationInfo.propagatedEntityIDs.has(entity)) {
         const entityTransformComponent = TransformComponentArray.getComponent(entity);
         
         const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
         const distanceFactor = distance / visionRange;

         propagationInfo.propagatedEntityIDs.add(slime);
         
         propagationInfo.chainLength++;

         if (propagationInfo.chainLength <= MAX_ANGER_PROPAGATION_CHAIN_LENGTH) {
            const propogatedAnger = lerp(amount * 1, amount * 0.4, Math.sqrt(distanceFactor));
            addEntityAnger(entity, angeredEntity, propogatedAnger, propagationInfo);
         }

         propagationInfo.chainLength--;
      }
   }
}

export function onSlimeHurt(slime: EntityID, attackingEntity: EntityID): void {
   const attackingEntityType = Board.getEntityType(attackingEntity);
   if (attackingEntityType === EntityType.iceSpikes || attackingEntityType === EntityType.cactus) return;

   addEntityAnger(slime, attackingEntity, 1, { chainLength: 0, propagatedEntityIDs: new Set() });
   propagateAnger(slime, attackingEntity, 1);
}

export function onSlimeDeath(slime: EntityID, attackingEntity: EntityID): void {
   if (wasTribeMemberKill(attackingEntity)) {
      const slimeComponent = SlimeComponentArray.getComponent(slime);
      createItemsOverEntity(slime, ItemType.slimeball, randInt(...SLIME_DROP_AMOUNTS[slimeComponent.size]), 40);
   }
}