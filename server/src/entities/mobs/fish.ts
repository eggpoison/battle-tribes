import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { FishComponentData } from "webgl-test-shared/dist/components";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { Point, randInt, customTickIntervalHasPassed, randFloat } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { EscapeAIComponentArray, FishComponentArray, HealthComponentArray, InventoryComponentArray, TribeMemberComponentArray, WanderAIComponentArray } from "../../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { WanderAIComponent } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, runHerdAI, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import Board, { tileRaytraceMatchesTileTypes } from "../../Board";
import { FishComponent } from "../../components/FishComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { EscapeAIComponent, updateEscapeAIComponent } from "../../components/EscapeAIComponent";
import { chooseEscapeEntity, registerAttackingEntity, runFromAttackingEntity } from "../../ai/escape-ai";
import { getInventory } from "../../components/InventoryComponent";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { SERVER } from "../../server";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { CollisionVars, entitiesAreColliding } from "../../collision";

const TURN_SPEED = Math.PI / 1.5;

const MAX_HEALTH = 5;

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

export function createFish(position: Point): Entity {
   const fish = new Entity(position, 2 * Math.PI * Math.random(), EntityType.fish, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new RectangularHitbox(fish.position.x, fish.position.y, 0.5, 0, 0, HitboxCollisionType.soft, fish.getNextHitboxLocalID(), fish.rotation, FISH_WIDTH, FISH_HEIGHT, 0);
   fish.addHitbox(hitbox);

   PhysicsComponentArray.addComponent(fish.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(fish.id, new HealthComponent(MAX_HEALTH));
   StatusEffectComponentArray.addComponent(fish.id, new StatusEffectComponent(0));
   WanderAIComponentArray.addComponent(fish.id, new WanderAIComponent());
   EscapeAIComponentArray.addComponent(fish.id, new EscapeAIComponent());
   FishComponentArray.addComponent(fish.id, new FishComponent(randInt(0, 3)));
   AIHelperComponentArray.addComponent(fish.id, new AIHelperComponent(VISION_RANGE));
   
   return fish;
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

const move = (fish: Entity, direction: number): void => {
   const physicsComponent = PhysicsComponentArray.getComponent(fish.id);
   
   if (fish.tile.type === TileType.water) {
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

      const fishComponent = FishComponentArray.getComponent(fish.id);
      if (customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TPS, LUNGE_INTERVAL)) {
         physicsComponent.velocity.x += LUNGE_FORCE * Math.sin(direction);
         physicsComponent.velocity.y += LUNGE_FORCE * Math.cos(direction);
         if (direction !== fish.rotation) {
            fish.rotation = direction;

            const physicsComponent = PhysicsComponentArray.getComponent(fish.id);
            physicsComponent.hitboxesAreDirty = true;
         }
      }
   }
}

const followLeader = (fish: Entity, leader: Entity): void => {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(leader.id);
   tribeMemberComponent.fishFollowerIDs.push(fish.id);
}

const unfollowLeader = (fish: Entity, leader: Entity): void => {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(leader.id);
   const idx = tribeMemberComponent.fishFollowerIDs.indexOf(fish.id);
   if (idx !== -1) {
      tribeMemberComponent.fishFollowerIDs.splice(idx, 1);
   }
}

const entityIsWearingFishlordSuit = (entityID: number): boolean => {
   if (!InventoryComponentArray.hasComponent(entityID)) {
      return false;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(entityID);
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot);

   const armour = armourInventory.itemSlots[1];
   return typeof armour === "undefined" || armour.type === ItemType.fishlord_suit;
}

export function tickFish(fish: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(fish.id);
   physicsComponent.overrideMoveSpeedMultiplier = fish.tile.type === TileType.water;

   const fishComponent = FishComponentArray.getComponent(fish.id);

   if (fish.tile.type !== TileType.water) {
      fishComponent.secondsOutOfWater += Settings.I_TPS;
      if (fishComponent.secondsOutOfWater >= 5 && customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TPS, 1.5)) {
         damageEntity(fish, 1, null, PlayerCauseOfDeath.lack_of_oxygen);
         SERVER.registerEntityHit({
            entityPositionX: fish.position.x,
            entityPositionY: fish.position.y,
            hitEntityID: fish.id,
            damage: 1,
            knockback: 0,
            angleFromAttacker: null,
            attackerID: -1,
            flags: 0
         });
      }
   } else {
      fishComponent.secondsOutOfWater = 0;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(fish.id);

   // If the leader dies or is out of vision range, stop following them
   if (fishComponent.leader !== null && (!Board.entityRecord.hasOwnProperty(fishComponent.leader.id) || !aiHelperComponent.visibleEntities.includes(fishComponent.leader))) {
      unfollowLeader(fish, fishComponent.leader);
      fishComponent.leader = null;
   }

   // Look for a leader
   if (fishComponent.leader === null) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entityIsWearingFishlordSuit(entity.id)) {
            // New leader
            fishComponent.leader = entity;
            followLeader(fish, entity);
            break;
         }
      }
   }

   // If a tribe member is wearing a fishlord suit, follow them
   if (fishComponent.leader !== null) {
      const target = Board.entityRecord[fishComponent.attackTargetID];
      if (typeof target === "undefined") {
         // Follow leader
         move(fish, fish.position.calculateAngleBetween(fishComponent.leader.position));
      } else {
         // Attack the target
         move(fish, fish.position.calculateAngleBetween(target.position));

         if (entitiesAreColliding(fish, target) !== CollisionVars.NO_COLLISION) {
            const healthComponent = HealthComponentArray.getComponent(target.id);
            if (!canDamageEntity(healthComponent, "fish")) {
               return;
            }
            
            const hitDirection = fish.position.calculateAngleBetween(target.position);

            damageEntity(target, 2, fish, PlayerCauseOfDeath.fish, "fish");
            applyKnockback(target, 100, hitDirection);
            SERVER.registerEntityHit({
               entityPositionX: target.position.x,
               entityPositionY: target.position.y,
               hitEntityID: target.id,
               damage: 2,
               knockback: 100,
               angleFromAttacker: hitDirection,
               attackerID: fish.id,
               flags: 0
            });
            addLocalInvulnerabilityHash(healthComponent, "fish", 0.3);
         }
      }
      return;
   }
   
   // Flail on the ground when out of water
   if (fish.tile.type !== TileType.water) {
      fishComponent.flailTimer += Settings.I_TPS;
      if (fishComponent.flailTimer >= 0.75) {
         const flailDirection = 2 * Math.PI * Math.random();
         fish.rotation = flailDirection + randFloat(-0.5, 0.5);
         
         physicsComponent.hitboxesAreDirty = true;
         
         physicsComponent.velocity.x += 200 * Math.sin(flailDirection);
         physicsComponent.velocity.y += 200 * Math.cos(flailDirection);
   
         fishComponent.flailTimer = 0;
      }

      stopEntity(physicsComponent);
      return;
   }

   // Escape AI
   const escapeAIComponent = EscapeAIComponentArray.getComponent(fish.id);
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
   const herdMembers = new Array<Entity>();
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (entity.type === EntityType.fish) {
         herdMembers.push(entity);
      }
   }
   if (herdMembers.length >= 1) {
      runHerdAI(fish, herdMembers, VISION_RANGE, TURN_RATE, MIN_SEPARATION_DISTANCE, SEPARATION_INFLUENCE, ALIGNMENT_INFLUENCE, COHESION_INFLUENCE);

      physicsComponent.acceleration.x = 100 * Math.sin(fish.rotation);
      physicsComponent.acceleration.y = 100 * Math.cos(fish.rotation);
      return;
   }

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(fish.id);
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
      while (++attempts <= 10 && !tileRaytraceMatchesTileTypes(fish.position.x, fish.position.y, x, y, [TileType.water])) {
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

export function onFishLeaderHurt(fish: Entity, attackingEntityID: number): void {
   if (HealthComponentArray.hasComponent(attackingEntityID)) {
      const fishComponent = FishComponentArray.getComponent(fish.id);
      fishComponent.attackTargetID = attackingEntityID;
   }
}

export function onFishHurt(fish: Entity, attackingEntity: Entity): void {
   registerAttackingEntity(fish, attackingEntity);
}

export function onFishDeath(fish: Entity): void {
   createItemsOverEntity(fish, ItemType.raw_fish, 1, 40);
}

export function onFishRemove(fish: Entity): void {
   // Remove the fish from its leaders' follower array
   const fishComponent = FishComponentArray.getComponent(fish.id);
   if (fishComponent.leader !== null) {
      unfollowLeader(fish, fishComponent.leader);
   }
}

export function serialiseFishComponent(fish: Entity): FishComponentData {
   const fishComponent = FishComponentArray.getComponent(fish.id);
   return {
      colour: fishComponent.colour
   };
}