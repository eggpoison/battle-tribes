import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { SlimeSize, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { Point, lerp, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { HealthComponentArray, SlimeComponentArray, WanderAIComponentArray } from "../../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity, getEntityHealth, healEntity } from "../../components/HealthComponent";
import { SlimeComponent } from "../../components/SlimeComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { entityHasReachedPosition, getEntitiesInRange, stopEntity, turnAngle } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { WanderAIComponent } from "../../components/WanderAIComponent";
import { createItemsOverEntity } from "../../entity-shared";
import Board from "../../Board";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { createSlimeSpit } from "../projectiles/slime-spit";
import { SERVER } from "../../server";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { wasTribeMemberKill } from "../tribes/tribe-member";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";

const TURN_SPEED = 2 * Math.PI;

const RADII: ReadonlyArray<number> = [32, 44, 60];
const MAX_HEALTH: ReadonlyArray<number> = [10, 20, 35];
const CONTACT_DAMAGE: ReadonlyArray<number> = [1, 2, 3];
const SPEED_MULTIPLIERS: ReadonlyArray<number> = [2.5, 1.75, 1];
const MERGE_WEIGHTS: ReadonlyArray<number> = [2, 5, 11];
const SLIME_DROP_AMOUNTS: ReadonlyArray<[minDropAmount: number, maxDropAmount: number]> = [
   [1, 2], // small slime
   [3, 5], // medium slime
   [6, 9] // large slime
];
const MAX_MERGE_WANT: ReadonlyArray<number> = [15 * Settings.TPS, 40 * Settings.TPS, 75 * Settings.TPS];

const VISION_RANGES = [200, 250, 300];

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
   readonly target: Entity;
}

interface AngerPropagationInfo {
   chainLength: number;
   readonly propagatedEntityIDs: Set<number>;
}

export function createSlime(position: Point, size: SlimeSize, orbSizes: Array<SlimeSize>): Entity {
   const slime = new Entity(position, 2 * Math.PI * Math.random(), EntityType.slime, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   slime.collisionPushForceMultiplier = 0.5;

   const mass = 1 + size * 0.5;
   const hitbox = new CircularHitbox(position, mass, 0, 0, HitboxCollisionType.soft, RADII[size], slime.getNextHitboxLocalID(), slime.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   slime.addHitbox(hitbox);

   PhysicsComponentArray.addComponent(slime.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(slime.id, new HealthComponent(MAX_HEALTH[size]));
   StatusEffectComponentArray.addComponent(slime.id, new StatusEffectComponent(StatusEffect.poisoned));
   SlimeComponentArray.addComponent(slime.id, new SlimeComponent(size, MERGE_WEIGHTS[size], orbSizes));
   WanderAIComponentArray.addComponent(slime.id, new WanderAIComponent());
   AIHelperComponentArray.addComponent(slime.id, new AIHelperComponent(VISION_RANGES[size]));

   return slime;
}

const updateAngerTarget = (slime: Entity): Entity | null => {
   const slimeComponent = SlimeComponentArray.getComponent(slime.id);

   // Target the entity which the slime is angry with the most
   let maxAnger = 0;
   let target: Entity;
   for (let i = 0; i < slimeComponent.angeredEntities.length; i++) {
      const angerInfo = slimeComponent.angeredEntities[i];

      // Remove anger at an entity if the entity is dead
      if (!Board.entityRecord.hasOwnProperty(angerInfo.target.id)) {
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
const wantsToMerge = (slimeComponent1: SlimeComponent, slime2: Entity): boolean => {
   const slimeComponent2 = SlimeComponentArray.getComponent(slime2.id);
   
   // Don't try to merge with larger slimes
   if (slimeComponent1.size > slimeComponent2.size) return false;

   const mergeWant = Board.ticks - slimeComponent1.lastMergeTicks;
   return mergeWant >= MAX_MERGE_WANT[slimeComponent1.size];
}

const createSpit = (slime: Entity, slimeComponent: SlimeComponent): void => {
   const x = slime.position.x + RADII[slimeComponent.size] * Math.sin(slime.rotation);
   const y = slime.position.y + RADII[slimeComponent.size] * Math.cos(slime.rotation);
   const spitCreationInfo = createSlimeSpit(new Point(x, y), 2 * Math.PI * Math.random(), slimeComponent.size === SlimeSize.medium ? 0 : 1);

   const physicsComponent = spitCreationInfo.components[ServerComponentType.physics];
   physicsComponent.velocity.x = 500 * Math.sin(slime.rotation);
   physicsComponent.velocity.y = 500 * Math.cos(slime.rotation);
}

// @Incomplete @Speed: Figure out why this first faster function seemingly gets called way less than the second one

const getEnemyChaseTargetID = (slime: Entity): number => {
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime.id);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestEnemyID = 0;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      if (entity.type === EntityType.slime || entity.type === EntityType.slimewisp || entity.tile.biome !== Biome.swamp || !HealthComponentArray.hasComponent(entity.id)) {
         continue;
      }

      const distanceSquared = slime.position.calculateDistanceSquaredBetween(entity.position);
      if (distanceSquared < minDist) {
         minDist = distanceSquared;
         closestEnemyID = entity.id;
      }
   }

   return closestEnemyID;
}

const getChaseTargetID = (slime: Entity): number => {
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime.id);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestEnemyID = 0;
   let closestMergerID = 0;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      if (entity.type === EntityType.slime) {
         // Don't try to merge with larger slimes
         const otherSlimeComponent = SlimeComponentArray.getComponent(entity.id);
         if (!slimeWantsToMerge(otherSlimeComponent)) {
            continue;
         }

         const distanceSquared = slime.position.calculateDistanceSquaredBetween(entity.position);
         if (distanceSquared < minDist) {
            minDist = distanceSquared;
            closestMergerID = entity.id;
         }
      } else {
         if (entity.type === EntityType.slimewisp || entity.tile.biome !== Biome.swamp || !HealthComponentArray.hasComponent(entity.id)) {
            continue;
         }

         const distanceSquared = slime.position.calculateDistanceSquaredBetween(entity.position);
         if (distanceSquared < minDist) {
            minDist = distanceSquared;
            closestEnemyID = entity.id;
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

export function tickSlime(slime: Entity): void {
   // Slimes move at normal speed on slime and sludge blocks
   const physicsComponent = PhysicsComponentArray.getComponent(slime.id);
   physicsComponent.overrideMoveSpeedMultiplier = slime.tile.type === TileType.slime || slime.tile.type === TileType.sludge;

   const slimeComponent = SlimeComponentArray.getComponent(slime.id);

   // Heal when standing on slime blocks
   if (slime.tile.type === TileType.slime) {
      if (Board.tickIntervalHasPassed(HEALING_PROC_INTERVAL)) {
         healEntity(slime, HEALING_ON_SLIME_PER_SECOND * HEALING_PROC_INTERVAL, slime.id);
      }
   }

   // Attack entities the slime is angry at
   const angerTarget = updateAngerTarget(slime);
   if (angerTarget !== null) {
      const targetDirection = slime.position.calculateAngleBetween(angerTarget.position);
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
      physicsComponent.acceleration.x = ACCELERATION * speedMultiplier * Math.sin(slime.rotation);
      physicsComponent.acceleration.y = ACCELERATION * speedMultiplier * Math.cos(slime.rotation);
      return;
   }

   // If the slime wants to merge, do a search for both merge and enemy targets. Otherwise only look for enemy targets
   let chaseTargetID: number;
   if (slimeWantsToMerge(slimeComponent)) {
      // Chase enemies and merge targets
      chaseTargetID = getChaseTargetID(slime);
   } else {
      // Chase enemies
      chaseTargetID = getEnemyChaseTargetID(slime);
   }
   if (chaseTargetID !== 0) {
      const chaseTarget = Board.entityRecord[chaseTargetID]!;
      
      const targetDirection = slime.position.calculateAngleBetween(chaseTarget.position);
      slimeComponent.eyeRotation = turnAngle(slimeComponent.eyeRotation, targetDirection, 5 * Math.PI);

      const speedMultiplier = SPEED_MULTIPLIERS[slimeComponent.size];
      physicsComponent.acceleration.x = ACCELERATION * speedMultiplier * Math.sin(slime.rotation);
      physicsComponent.acceleration.y = ACCELERATION * speedMultiplier * Math.cos(slime.rotation);

      physicsComponent.targetRotation = targetDirection;
      physicsComponent.turnSpeed = TURN_SPEED;
      return;
   }

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(slime.id);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(slime, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.5)) {
      const visionRange = VISION_RANGES[slimeComponent.size];

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

const merge = (slime1: Entity, slime2: Entity): void => {
   // Prevents both slimes fromj calling this function
   if (Board.entityIsFlaggedForDestruction(slime2)) return;

   const slimeComponent1 = SlimeComponentArray.getComponent(slime1.id);
   const slimeComponent2 = SlimeComponentArray.getComponent(slime2.id);
   slimeComponent1.mergeWeight += slimeComponent2.mergeWeight;

   slimeComponent1.mergeTimer = SLIME_MERGE_TIME;

   if (slimeComponent1.size < SlimeSize.large && slimeComponent1.mergeWeight >= MERGE_WEIGHTS[slimeComponent1.size + 1]) {
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
      
      const slimeSpawnPosition = new Point((slime1.position.x + slime2.position.x) / 2, (slime1.position.y + slime2.position.y) / 2);
      createSlime(slimeSpawnPosition, slimeComponent1.size + 1, orbSizes);
      
      slime1.destroy();
   } else {
      // @Incomplete: This allows small slimes to eat larger slimes. Very bad.
      
      // Add the other slime's health
      healEntity(slime1, getEntityHealth(slime2), slime1.id)

      slimeComponent1.orbSizes.push(slimeComponent2.size);

      slimeComponent1.lastMergeTicks = Board.ticks;
   }
   
   slime2.destroy();
}

export function onSlimeCollision(slime: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   // Merge with slimes
   if (collidingEntity.type === EntityType.slime) {
      const slimeComponent = SlimeComponentArray.getComponent(slime.id);
      if (wantsToMerge(slimeComponent, collidingEntity)) {
         slimeComponent.mergeTimer -= Settings.I_TPS;
         if (slimeComponent.mergeTimer <= 0) {
            merge(slime, collidingEntity);
         }
      }
      return;
   }
   
   if (collidingEntity.type === EntityType.slimewisp) return;
   
   if (HealthComponentArray.hasComponent(collidingEntity.id)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
      if (!canDamageEntity(healthComponent, "slime")) {
         return;
      }

      const slimeComponent = SlimeComponentArray.getComponent(slime.id);
      const damage = CONTACT_DAMAGE[slimeComponent.size];

      damageEntity(collidingEntity, slime, damage, PlayerCauseOfDeath.slime, AttackEffectiveness.effective, collisionPoint, 0);
      addLocalInvulnerabilityHash(healthComponent, "slime", 0.3);
   }
}

const addEntityAnger = (slime: Entity, entity: Entity, amount: number, propagationInfo: AngerPropagationInfo): void => {
   const slimeComponent = SlimeComponentArray.getComponent(slime.id);

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

const propagateAnger = (slime: Entity, angeredEntity: Entity, amount: number, propagationInfo: AngerPropagationInfo = { chainLength: 0, propagatedEntityIDs: new Set() }): void => {
   const slimeComponent = SlimeComponentArray.getComponent(slime.id);

   const visionRange = VISION_RANGES[slimeComponent.size];
   // @Speed
   const visibleEntities = getEntitiesInRange(slime.position.x, slime.position.y, visionRange);

   // @Cleanup: don't do here
   let idx = visibleEntities.indexOf(slime);
   while (idx !== -1) {
      visibleEntities.splice(idx, 1);
      idx = visibleEntities.indexOf(slime);
   }
   
   // Propagate the anger
   for (const entity of visibleEntities) {
      if (entity.type === EntityType.slime && !propagationInfo.propagatedEntityIDs.has(entity.id)) {
         const distance = slime.position.calculateDistanceBetween(entity.position);
         const distanceFactor = distance / visionRange;

         propagationInfo.propagatedEntityIDs.add(slime.id);
         
         propagationInfo.chainLength++;

         if (propagationInfo.chainLength <= MAX_ANGER_PROPAGATION_CHAIN_LENGTH) {
            const propogatedAnger = lerp(amount * 1, amount * 0.4, Math.sqrt(distanceFactor));
            addEntityAnger(entity, angeredEntity, propogatedAnger, propagationInfo);
         }

         propagationInfo.chainLength--;
      }
   }
}

export function onSlimeHurt(slime: Entity, attackingEntity: Entity): void {
   if (attackingEntity.type === EntityType.iceSpikes || attackingEntity.type === EntityType.cactus) return;

   addEntityAnger(slime, attackingEntity, 1, { chainLength: 0, propagatedEntityIDs: new Set() });
   propagateAnger(slime, attackingEntity, 1);
}

export function onSlimeDeath(slime: Entity, attackingEntity: Entity): void {
   if (wasTribeMemberKill(attackingEntity)) {
      const slimeComponent = SlimeComponentArray.getComponent(slime.id);
      createItemsOverEntity(slime, ItemType.slimeball, randInt(...SLIME_DROP_AMOUNTS[slimeComponent.size]), 40);
   }
}