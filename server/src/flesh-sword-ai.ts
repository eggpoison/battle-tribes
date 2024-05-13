import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, lerp, randItem, angle } from "webgl-test-shared/dist/utils";
import Board from "./Board";
import Tile from "./Tile";
import Entity from "./Entity";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { Biome } from "webgl-test-shared/dist/tiles";

const FLESH_SWORD_VISION_RANGE = 250;

const FLESH_SWORD_WANDER_MOVE_SPEED = 35;
const FLESH_SWORD_ESCAPE_MOVE_SPEED = 50;

const FLESH_SWORD_WANDER_RATE = 0.3;

const getVisibleEntities = (itemEntity: Entity): ReadonlyArray<Entity> => {
   const minChunkX = Math.max(Math.min(Math.floor((itemEntity.position.x - FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((itemEntity.position.x + FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((itemEntity.position.y - FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((itemEntity.position.y + FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);

   const entitiesInVisionRange = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            // Don't add existing entities
            if (entitiesInVisionRange.includes(entity)) continue;

            if (Math.pow(itemEntity.position.x - entity.position.x, 2) + Math.pow(itemEntity.position.y - entity.position.y, 2) <= Math.pow(FLESH_SWORD_VISION_RANGE, 2)) {
               entitiesInVisionRange.push(entity);
            }
         }
      }  
   }

   return entitiesInVisionRange;
}

/** Returns the entity the flesh sword should run away from, or null if there are none */
const getRunTarget = (itemEntity: Entity, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   let closestRunTargetDistance = Number.MAX_SAFE_INTEGER;
   let runTarget: Entity | null = null;

   for (const entity of visibleEntities) {
      if (entity.type === EntityType.player || entity.type === EntityType.tribeWorker || entity.type === EntityType.tribeWarrior) {
         const distance = itemEntity.position.calculateDistanceBetween(entity.position);
         if (distance < closestRunTargetDistance) {
            closestRunTargetDistance = distance;
            runTarget = entity;
         }
      }
   }

   return runTarget;
}

const getTileWanderTargets = (itemEntity: Entity): Array<Tile> => {
   const wanderTargets = new Array<Tile>();

   const minTileX = Math.max(Math.min(Math.floor((itemEntity.position.x - FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const maxTileX = Math.max(Math.min(Math.floor((itemEntity.position.x + FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const minTileY = Math.max(Math.min(Math.floor((itemEntity.position.y - FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const maxTileY = Math.max(Math.min(Math.floor((itemEntity.position.y + FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         // Don't try to wander to wall tiles
         const tile = Board.getTile(tileX, tileY);
         if (tile.isWall) continue;

         
         const position = new Point((tileX + Math.random()) * Settings.TILE_SIZE, (tileY + Math.random()) * Settings.TILE_SIZE);
         const distance = itemEntity.position.calculateDistanceBetween(position);
         if (distance <= FLESH_SWORD_VISION_RANGE) {
            wanderTargets.push(tile);
         }
      }
   }

   return wanderTargets;
}

const hasReachedTargetPosition = (itemEntity: Entity, targetPosition: Point): boolean => {
   const physicsComponent = PhysicsComponentArray.getComponent(itemEntity.id);
   if (physicsComponent.velocity.x === 0 || physicsComponent.velocity.y === 0) return true;
   
   const relativeTargetPosition = itemEntity.position.copy();
   relativeTargetPosition.subtract(targetPosition);

   const dotProduct = physicsComponent.velocity.calculateDotProduct(relativeTargetPosition);
   return dotProduct > 0;
}

interface FleshSwordInfo {
   internalWiggleTicks: number;
   // @Speed: Garbage collection
   tileTargetPosition: Point | null;
}

const FLESH_SWORD_INFO: Partial<Record<number, FleshSwordInfo>> = {};

export function runFleshSwordAI(itemEntity: Entity) {
   const info = FLESH_SWORD_INFO[itemEntity.id];
   if (typeof info === "undefined") {
      console.warn("Dropped item isn't a flesh sword.");
      return;
   }

   // Position the flesh sword wants to move to
   let targetPositionX = -1;
   let targetPositionY = -1;
   let moveSpeed: number | undefined;
   let wiggleSpeed: number | undefined;

   const visibleEntities = getVisibleEntities(itemEntity);

   const runTarget = getRunTarget(itemEntity, visibleEntities);

   // Run away from the run target
   if (runTarget !== null) {
      const angleFromTarget = itemEntity.position.calculateAngleBetween(runTarget.position);
      targetPositionX = itemEntity.position.x + 100 * Math.sin(angleFromTarget + Math.PI);
      targetPositionY = itemEntity.position.y + 100 * Math.cos(angleFromTarget + Math.PI);
      
      const distance = itemEntity.position.calculateDistanceBetween(runTarget.position);
      let dist = distance / FLESH_SWORD_VISION_RANGE;
      dist = Math.pow(1 - dist, 2);
      wiggleSpeed = lerp(1, 4, dist);
      moveSpeed = FLESH_SWORD_ESCAPE_MOVE_SPEED * lerp(1, 3.5, dist);

      info.tileTargetPosition = null;
   } else {
      if (info.tileTargetPosition !== null) {
         if (hasReachedTargetPosition(itemEntity, info.tileTargetPosition)) {
            info.tileTargetPosition = null;
         } else {
            targetPositionX = info.tileTargetPosition.x;
            targetPositionY = info.tileTargetPosition.y;
            moveSpeed = FLESH_SWORD_WANDER_MOVE_SPEED;
            wiggleSpeed = 1;
         }
      } else {
         // Chance to try to wander to a nearby tile
         if (Math.random() < FLESH_SWORD_WANDER_RATE / Settings.TPS) {
            const tileWanderTargets = getTileWanderTargets(itemEntity);
   
            // If any of the tiles are in a swamp, move to them
            // Otherwise move to any random tile
            
            let foundSwampTile = false;
            for (const tile of tileWanderTargets) {
               if (tile.biome === Biome.swamp) {
                  foundSwampTile = true;
                  break;
               }
            }

            let targetTile: Tile;
            if (foundSwampTile) {
               const tiles = new Array<Tile>();
               for (const tile of tileWanderTargets) {
                  if (tile.biome === Biome.swamp) {
                     tiles.push(tile);
                  }
               }
               targetTile = randItem(tiles);
            } else {
               targetTile = randItem(tileWanderTargets);
            }
   
            const x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
            const y = (targetTile.y + Math.random()) * Settings.TILE_SIZE;
            info.tileTargetPosition = new Point(x, y);
            moveSpeed = FLESH_SWORD_WANDER_MOVE_SPEED;
            wiggleSpeed = 1;
         }
      }
   }

   if (targetPositionX !== -1) {
      info.internalWiggleTicks += wiggleSpeed!;
      
      const directMoveAngle = angle(targetPositionX - itemEntity.position.x, targetPositionY - itemEntity.position.y);

      const moveAngleOffset = Math.sin(info.internalWiggleTicks / Settings.TPS * 10) * Math.PI * 0.2;

      const physicsComponent = PhysicsComponentArray.getComponent(itemEntity.id);

      const moveAngle = directMoveAngle + moveAngleOffset;
      itemEntity.rotation = moveAngle - Math.PI/4;
      physicsComponent.velocity.x = moveSpeed! * Math.sin(moveAngle);
      physicsComponent.velocity.y = moveSpeed! * Math.cos(moveAngle);

      physicsComponent.hitboxesAreDirty = true;
   }
}

export function addFleshSword(itemEntity: Entity): void {
   FLESH_SWORD_INFO[itemEntity.id] = {
      internalWiggleTicks: 0,
      tileTargetPosition: null
   };
}

export function removeFleshSword(itemEntity: Entity): void {
   delete FLESH_SWORD_INFO[itemEntity.id];
}