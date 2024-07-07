import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { Point, randInt, customTickIntervalHasPassed, randFloat } from "webgl-test-shared/dist/utils";
import { getRandomPositionInEntity } from "../../Entity";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { WanderAIComponentArray } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, runHerdAI, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import Board, { tileRaytraceMatchesTileTypes } from "../../Board";
import { FishComponentArray } from "../../components/FishComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { EscapeAIComponentArray, updateEscapeAIComponent } from "../../components/EscapeAIComponent";
import { chooseEscapeEntity, registerAttackingEntity, runFromAttackingEntity } from "../../ai/escape-ai";
import { InventoryComponentArray, getInventory, hasInventory } from "../../components/InventoryComponent";
import { AIHelperComponentArray } from "../../components/AIHelperComponent";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { TribeMemberComponentArray } from "../../components/TribeMemberComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items/items";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.wanderAI
   | ServerComponentType.escapeAI
   | ServerComponentType.aiHelper
   | ServerComponentType.fish;

const TURN_SPEED = Math.PI / 1.5;

const FISH_WIDTH = 7 * 4;
const FISH_HEIGHT = 14 * 4;

const ACCELERATION = 40;

const TURN_RATE = 0.5;
const SEPARATION_INFLUENCE = 0.7;
const ALIGNMENT_INFLUENCE = 0.5;
const COHESION_INFLUENCE = 0.3;
const MIN_SEPARATION_DISTANCE = 40;

const VISION_RANGE = 200;

const TILE_VALIDATION_PADDING = 20;

const LUNGE_FORCE = 200;
const LUNGE_INTERVAL = 1;

export function createFishConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.fish,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new RectangularHitbox(0.5, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, FISH_WIDTH, FISH_HEIGHT, 0)]
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
         maxHealth: 5
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.escapeAI]: {},
      [ServerComponentType.aiHelper]: {
         visionRange: VISION_RANGE
      },
      [ServerComponentType.fish]: {
         colour: randInt(0, 3)
      }
   };
}

const isValidWanderPosition = (x: number, y: number): boolean => {
   const minTileX = Math.max(Math.floor((x - TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileX = Math.min(Math.floor((x + TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
   const minTileY = Math.max(Math.floor((y - TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileY = Math.min(Math.floor((y + TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.biome !== Biome.river) {
            return false;
         }
      }
   }

   return true;
}

const move = (fish: EntityID, direction: number): void => {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const physicsComponent = PhysicsComponentArray.getComponent(fish);
   
   if (transformComponent.tile.type === TileType.water) {
      // Swim on water
      physicsComponent.acceleration.x = 40 * Math.sin(direction);
      physicsComponent.acceleration.y = 40 * Math.cos(direction);
      physicsComponent.targetRotation = direction;
      physicsComponent.turnSpeed = TURN_SPEED;
   } else {
      // 
      // Lunge on land
      // 

      stopEntity(physicsComponent);

      const fishComponent = FishComponentArray.getComponent(fish);
      if (customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TPS, LUNGE_INTERVAL)) {
         physicsComponent.velocity.x += LUNGE_FORCE * Math.sin(direction);
         physicsComponent.velocity.y += LUNGE_FORCE * Math.cos(direction);
         if (direction !== transformComponent.rotation) {
            transformComponent.rotation = direction;

            const physicsComponent = PhysicsComponentArray.getComponent(fish);
            physicsComponent.hitboxesAreDirty = true;
         }
      }
   }
}

const followLeader = (fish: EntityID, leader: EntityID): void => {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(leader);
   tribeMemberComponent.fishFollowerIDs.push(fish);
}

// @Cleanup: shouldn't be exported
export function unfollowLeader(fish: EntityID, leader: EntityID): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(leader);
   const idx = tribeMemberComponent.fishFollowerIDs.indexOf(fish);
   if (idx !== -1) {
      tribeMemberComponent.fishFollowerIDs.splice(idx, 1);
   }
}

const entityIsWearingFishlordSuit = (entityID: number): boolean => {
   if (!InventoryComponentArray.hasComponent(entityID)) {
      return false;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(entityID);
   if (!hasInventory(inventoryComponent, InventoryName.armourSlot)) {
      return false;
   }
   
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot);

   const armour = armourInventory.itemSlots[1];
   return typeof armour !== "undefined" && armour.type === ItemType.fishlord_suit;
}

export function tickFish(fish: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const physicsComponent = PhysicsComponentArray.getComponent(fish);

   physicsComponent.overrideMoveSpeedMultiplier = transformComponent.tile.type === TileType.water;

   const fishComponent = FishComponentArray.getComponent(fish);

   if (transformComponent.tile.type !== TileType.water) {
      fishComponent.secondsOutOfWater += Settings.I_TPS;
      if (fishComponent.secondsOutOfWater >= 5 && customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TPS, 1.5)) {
         const hitPosition = getRandomPositionInEntity(fish);
         damageEntity(fish, null, 1, PlayerCauseOfDeath.lack_of_oxygen, AttackEffectiveness.effective, hitPosition, 0);
      }
   } else {
      fishComponent.secondsOutOfWater = 0;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(fish);

   // If the leader dies or is out of vision range, stop following them
   if (fishComponent.leader !== null && (!Board.hasEntity(fishComponent.leader) || !aiHelperComponent.visibleEntities.includes(fishComponent.leader))) {
      unfollowLeader(fish, fishComponent.leader);
      fishComponent.leader = null;
   }

   // Look for a leader
   if (fishComponent.leader === null) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entityIsWearingFishlordSuit(entity)) {
            // New leader
            fishComponent.leader = entity;
            followLeader(fish, entity);
            break;
         }
      }
   }

   // If a tribe member is wearing a fishlord suit, follow them
   if (fishComponent.leader !== null) {
      const target = fishComponent.attackTargetID;
      if (Board.hasEntity(target)) {
         const leaderTransformComponent = TransformComponentArray.getComponent(fishComponent.leader);
         
         // Follow leader
         move(fish, transformComponent.position.calculateAngleBetween(leaderTransformComponent.position));
      } else {
         const targetTransformComponent = TransformComponentArray.getComponent(target);

         // Attack the target
         move(fish, transformComponent.position.calculateAngleBetween(targetTransformComponent.position));

         if (entitiesAreColliding(fish, target) !== CollisionVars.NO_COLLISION) {
            const healthComponent = HealthComponentArray.getComponent(target);
            if (!canDamageEntity(healthComponent, "fish")) {
               return;
            }
            
            const hitDirection = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);

            // @Hack
            const collisionPoint = new Point((transformComponent.position.x + targetTransformComponent.position.x) / 2, (transformComponent.position.y + targetTransformComponent.position.y) / 2);
            
            damageEntity(target, fish, 2, PlayerCauseOfDeath.fish, AttackEffectiveness.effective, collisionPoint, 0);
            applyKnockback(target, 100, hitDirection);
            addLocalInvulnerabilityHash(healthComponent, "fish", 0.3);
         }
      }
      return;
   }
   
   // Flail on the ground when out of water
   if (transformComponent.tile.type !== TileType.water) {
      fishComponent.flailTimer += Settings.I_TPS;
      if (fishComponent.flailTimer >= 0.75) {
         const flailDirection = 2 * Math.PI * Math.random();
         transformComponent.rotation = flailDirection + randFloat(-0.5, 0.5);
         
         physicsComponent.hitboxesAreDirty = true;
         
         physicsComponent.velocity.x += 200 * Math.sin(flailDirection);
         physicsComponent.velocity.y += 200 * Math.cos(flailDirection);
   
         fishComponent.flailTimer = 0;
      }

      stopEntity(physicsComponent);
      return;
   }

   // Escape AI
   const escapeAIComponent = EscapeAIComponentArray.getComponent(fish);
   updateEscapeAIComponent(escapeAIComponent, 3 * Settings.TPS);
   if (escapeAIComponent.attackingEntityIDs.length > 0) {
      const escapeEntity = chooseEscapeEntity(fish, aiHelperComponent.visibleEntities);
      if (escapeEntity !== null) {
         runFromAttackingEntity(fish, escapeEntity, 200, TURN_SPEED);
         return;
      }
   }

   // Herd AI
   // @Incomplete: Make fish steer away from land
   const herdMembers = new Array<EntityID>();
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (Board.getEntityType(entity) === EntityType.fish) {
         herdMembers.push(entity);
      }
   }
   if (herdMembers.length >= 1) {
      runHerdAI(fish, herdMembers, VISION_RANGE, TURN_RATE, MIN_SEPARATION_DISTANCE, SEPARATION_INFLUENCE, ALIGNMENT_INFLUENCE, COHESION_INFLUENCE);

      physicsComponent.acceleration.x = 100 * Math.sin(transformComponent.rotation);
      physicsComponent.acceleration.y = 100 * Math.cos(transformComponent.rotation);
      return;
   }

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(fish);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(fish, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.5)) {
      let attempts = 0;
      let targetTile: Tile;
      do {
         targetTile = getWanderTargetTile(fish, VISION_RANGE);
      } while (++attempts <= 50 && (targetTile.isWall || targetTile.biome !== Biome.river));

      if (attempts > 50) {
         stopEntity(physicsComponent);
         return;
      }
      
      // Find a position not too close to land
      let x: number;
      let y: number;
      do {
         x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
         y = (targetTile.y + Math.random()) * Settings.TILE_SIZE;
      } while (!isValidWanderPosition(x, y));

      // Find a path which doesn't cross land
      attempts = 0;
      while (++attempts <= 10 && !tileRaytraceMatchesTileTypes(transformComponent.position.x, transformComponent.position.y, x, y, [TileType.water])) {
         x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
         y = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
      }

      if (attempts <= 10) {
         wander(fish, x, y, ACCELERATION, TURN_SPEED);
      } else {
         stopEntity(physicsComponent);
      }
   } else {
      stopEntity(physicsComponent);
   }
}

export function onFishLeaderHurt(fish: EntityID, attackingEntity: EntityID): void {
   if (HealthComponentArray.hasComponent(attackingEntity)) {
      const fishComponent = FishComponentArray.getComponent(fish);
      fishComponent.attackTargetID = attackingEntity;
   }
}

export function onFishHurt(fish: EntityID, attackingEntity: EntityID): void {
   registerAttackingEntity(fish, attackingEntity);
}

export function onFishDeath(fish: EntityID): void {
   createItemsOverEntity(fish, ItemType.raw_fish, 1, 40);
}