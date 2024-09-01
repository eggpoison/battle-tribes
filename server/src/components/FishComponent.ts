import { EntityID, EntityType, FishColour, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";
import { FishVars, unfollowLeader } from "../entities/mobs/fish";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Packet } from "webgl-test-shared/dist/packets";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType, Biome } from "webgl-test-shared/dist/tiles";
import { customTickIntervalHasPassed, Point, randFloat, TileIndex, UtilVars } from "webgl-test-shared/dist/utils";
import { stopEntity, runHerdAI, entityHasReachedPosition } from "../ai-shared";
import { chooseEscapeEntity, runFromAttackingEntity } from "../ai/escape-ai";
import { shouldWander, getWanderTargetTile, wander } from "../ai/wander-ai";
import Board, { tileRaytraceMatchesTileTypes } from "../Board";
import { entitiesAreColliding, CollisionVars } from "../collision";
import { getRandomPositionInEntity } from "../Entity";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { EscapeAIComponentArray, updateEscapeAIComponent } from "./EscapeAIComponent";
import { damageEntity, HealthComponentArray, canDamageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { InventoryComponentArray, hasInventory, getInventory } from "./InventoryComponent";
import { PhysicsComponentArray, applyKnockback } from "./PhysicsComponent";
import { TransformComponentArray, getEntityTile } from "./TransformComponent";
import { WanderAIComponentArray } from "./WanderAIComponent";
import { TribeMemberComponentArray } from "./TribeMemberComponent";

const enum Vars {
   TURN_SPEED = UtilVars.PI / 1.5,

   ACCELERATION = 40,
   
   TURN_RATE = 0.5,
   SEPARATION_INFLUENCE = 0.7,
   ALIGNMENT_INFLUENCE = 0.5,
   COHESION_INFLUENCE = 0.3,
   MIN_SEPARATION_DISTANCE = 40,

   TILE_VALIDATION_PADDING = 20,
   
   LUNGE_FORCE = 200,
   LUNGE_INTERVAL = 1
}

export interface FishComponentParams {
   readonly colour: FishColour;
}

export class FishComponent {
   public readonly colour: FishColour;

   public flailTimer = 0;
   public secondsOutOfWater = 0;

   public leader: EntityID | null = null;
   public attackTargetID = 0;

   constructor(params: FishComponentParams) {
      this.colour = params.colour;
   }
}

export const FishComponentArray = new ComponentArray<FishComponent>(ServerComponentType.fish, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const isValidWanderPosition = (x: number, y: number): boolean => {
   const minTileX = Math.max(Math.floor((x - Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileX = Math.min(Math.floor((x + Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
   const minTileY = Math.max(Math.floor((y - Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileY = Math.min(Math.floor((y + Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         if (Board.getTileBiome(tileX, tileY) !== Biome.river) {
            return false;
         }
      }
   }

   return true;
}

const move = (fish: EntityID, direction: number): void => {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const physicsComponent = PhysicsComponentArray.getComponent(fish);
   
   const tileIndex = getEntityTile(transformComponent);
   if (Board.tileTypes[tileIndex] === TileType.water) {
      // Swim on water
      physicsComponent.acceleration.x = 40 * Math.sin(direction);
      physicsComponent.acceleration.y = 40 * Math.cos(direction);
      physicsComponent.targetRotation = direction;
      physicsComponent.turnSpeed = Vars.TURN_SPEED;
   } else {
      // 
      // Lunge on land
      // 

      stopEntity(physicsComponent);

      const fishComponent = FishComponentArray.getComponent(fish);
      if (customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TPS, Vars.LUNGE_INTERVAL)) {
         physicsComponent.velocity.x += Vars.LUNGE_FORCE * Math.sin(direction);
         physicsComponent.velocity.y += Vars.LUNGE_FORCE * Math.cos(direction);
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

function onTick(fishComponent: FishComponent, fish: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const physicsComponent = PhysicsComponentArray.getComponent(fish);

   const tileIndex = getEntityTile(transformComponent);
   const tileType = Board.tileTypes[tileIndex];

   physicsComponent.overrideMoveSpeedMultiplier = tileType === TileType.water;

   if (tileType !== TileType.water) {
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
   if (tileType !== TileType.water) {
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
   if (escapeAIComponent.attackingEntities.length > 0) {
      const escapeEntity = chooseEscapeEntity(fish, aiHelperComponent.visibleEntities);
      if (escapeEntity !== null) {
         runFromAttackingEntity(fish, escapeEntity, 200, Vars.TURN_SPEED);
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
      runHerdAI(fish, herdMembers, FishVars.VISION_RANGE, Vars.TURN_RATE, Vars.MIN_SEPARATION_DISTANCE, Vars.SEPARATION_INFLUENCE, Vars.ALIGNMENT_INFLUENCE, Vars.COHESION_INFLUENCE);

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
   } else if (shouldWander(physicsComponent, 1)) {
      let attempts = 0;
      let targetTile: TileIndex;
      do {
         targetTile = getWanderTargetTile(fish, FishVars.VISION_RANGE);
      } while (++attempts <= 50 && (Board.tileIsWalls[targetTile] === 1 || Board.tileBiomes[targetTile] !== Biome.river));

      if (attempts > 50) {
         stopEntity(physicsComponent);
         return;
      }
      
      // Find a position not too close to land
      let x: number;
      let y: number;
      do {
         const tileX = Board.getTileX(targetTile);
         const tileY = Board.getTileY(targetTile);
         x = (tileX + Math.random()) * Settings.TILE_SIZE;
         y = (tileY + Math.random()) * Settings.TILE_SIZE;
      } while (!isValidWanderPosition(x, y));

      // Find a path which doesn't cross land
      attempts = 0;
      while (++attempts <= 10 && !tileRaytraceMatchesTileTypes(transformComponent.position.x, transformComponent.position.y, x, y, [TileType.water])) {
         const tileX = Board.getTileX(targetTile);
         const tileY = Board.getTileY(targetTile);
         x = (tileX + Math.random()) * Settings.TILE_SIZE;
         y = (tileY + Math.random()) * Settings.TILE_SIZE;
      }

      if (attempts <= 10) {
         wander(fish, x, y, Vars.ACCELERATION, Vars.TURN_SPEED);
      } else {
         stopEntity(physicsComponent);
      }
   } else {
      stopEntity(physicsComponent);
   }
}

function onRemove(entity: EntityID): void {
   // Remove the fish from its leaders' follower array
   const fishComponent = FishComponentArray.getComponent(entity);
   if (fishComponent.leader !== null) {
      unfollowLeader(entity, fishComponent.leader);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const fishComponent = FishComponentArray.getComponent(entity);

   packet.addNumber(fishComponent.colour);
}