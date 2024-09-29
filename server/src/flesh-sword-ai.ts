import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, lerp, randItem, angle, TileIndex } from "battletribes-shared/utils";
import Layer, { getTileIndexIncludingEdges, getTileX, getTileY } from "./Layer";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { Biome } from "battletribes-shared/tiles";
import { TransformComponentArray } from "./components/TransformComponent";
import { entityHasReachedPosition } from "./ai-shared";
import { getEntityLayer, getEntityType } from "./world";

const FLESH_SWORD_VISION_RANGE = 250;

const FLESH_SWORD_WANDER_MOVE_SPEED = 35;
const FLESH_SWORD_ESCAPE_MOVE_SPEED = 50;

const FLESH_SWORD_WANDER_RATE = 0.3;

const getVisibleEntities = (itemEntity: EntityID): ReadonlyArray<EntityID> => {
   const transformComponent = TransformComponentArray.getComponent(itemEntity);
   const layer = getEntityLayer(itemEntity);
   
   const minChunkX = Math.max(Math.min(Math.floor((transformComponent.position.x - FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((transformComponent.position.x + FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((transformComponent.position.y - FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((transformComponent.position.y + FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);

   const entitiesInVisionRange = new Array<EntityID>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            // Don't add existing entities
            if (entitiesInVisionRange.includes(entity)) continue;

            const entityTransformComponent = TransformComponentArray.getComponent(itemEntity);
            
            if (Math.pow(transformComponent.position.x - entityTransformComponent.position.x, 2) + Math.pow(transformComponent.position.y - entityTransformComponent.position.y, 2) <= Math.pow(FLESH_SWORD_VISION_RANGE, 2)) {
               entitiesInVisionRange.push(entity);
            }
         }
      }  
   }

   return entitiesInVisionRange;
}

/** Returns the entity the flesh sword should run away from, or null if there are none */
const getRunTarget = (itemEntity: EntityID, visibleEntities: ReadonlyArray<EntityID>): EntityID | null => {
   const transformComponent = TransformComponentArray.getComponent(itemEntity);

   let closestRunTargetDistance = Number.MAX_SAFE_INTEGER;
   let runTarget: EntityID | null = null;

   for (const entity of visibleEntities) {
      const entityType = getEntityType(entity);
      if (entityType === EntityType.player || entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior) {
         const entityTransformComponent = TransformComponentArray.getComponent(itemEntity);

         const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
         if (distance < closestRunTargetDistance) {
            closestRunTargetDistance = distance;
            runTarget = entity;
         }
      }
   }

   return runTarget;
}

const getTileWanderTargets = (itemEntity: EntityID): Array<TileIndex> => {
   const transformComponent = TransformComponentArray.getComponent(itemEntity);
   const layer = getEntityLayer(itemEntity);

   const minTileX = Math.max(Math.min(Math.floor((transformComponent.position.x - FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const maxTileX = Math.max(Math.min(Math.floor((transformComponent.position.x + FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const minTileY = Math.max(Math.min(Math.floor((transformComponent.position.y - FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const maxTileY = Math.max(Math.min(Math.floor((transformComponent.position.y + FLESH_SWORD_VISION_RANGE) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);

   const wanderTargets = new Array<TileIndex>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         // Don't try to wander to wall tiles
         if (layer.tileIsWalls[tileIndex]) continue;
         
         const position = new Point((tileX + Math.random()) * Settings.TILE_SIZE, (tileY + Math.random()) * Settings.TILE_SIZE);
         const distance = transformComponent.position.calculateDistanceBetween(position);
         if (distance <= FLESH_SWORD_VISION_RANGE) {
            wanderTargets.push(tileIndex);
         }
      }
   }

   return wanderTargets;
}

interface FleshSwordInfo {
   internalWiggleTicks: number;
   // @Speed: Garbage collection
   tileTargetPosition: Point | null;
}

const FLESH_SWORD_INFO: Partial<Record<number, FleshSwordInfo>> = {};

export function runFleshSwordAI(itemEntity: EntityID) {
   const info = FLESH_SWORD_INFO[itemEntity];
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

   const transformComponent = TransformComponentArray.getComponent(itemEntity);

   // Run away from the run target
   if (runTarget !== null) {
      const runTargetTransformComponent = TransformComponentArray.getComponent(runTarget);
      
      const angleFromTarget = transformComponent.position.calculateAngleBetween(runTargetTransformComponent.position);
      targetPositionX = transformComponent.position.x + 100 * Math.sin(angleFromTarget + Math.PI);
      targetPositionY = transformComponent.position.y + 100 * Math.cos(angleFromTarget + Math.PI);
      
      const distance = transformComponent.position.calculateDistanceBetween(runTargetTransformComponent.position);
      let dist = distance / FLESH_SWORD_VISION_RANGE;
      dist = Math.pow(1 - dist, 2);
      wiggleSpeed = lerp(1, 4, dist);
      moveSpeed = FLESH_SWORD_ESCAPE_MOVE_SPEED * lerp(1, 3.5, dist);

      info.tileTargetPosition = null;
   } else {
      if (info.tileTargetPosition !== null) {
         if (entityHasReachedPosition(itemEntity, info.tileTargetPosition.x, info.tileTargetPosition.y)) {
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

            const layer = getEntityLayer(itemEntity);
            
            let foundSwampTile = false;
            for (const tileIndex of tileWanderTargets) {
               if (layer.tileBiomes[tileIndex] === Biome.swamp) {
                  foundSwampTile = true;
                  break;
               }
            }

            let targetTile: TileIndex;
            if (foundSwampTile) {
               const tiles = new Array<TileIndex>();
               for (const tileIndex of tileWanderTargets) {
                  if (layer.tileBiomes[tileIndex] === Biome.swamp) {
                     tiles.push(tileIndex);
                  }
               }
               targetTile = randItem(tiles);
            } else {
               targetTile = randItem(tileWanderTargets);
            }
   
            const x = (getTileX(targetTile) + Math.random()) * Settings.TILE_SIZE;
            const y = (getTileY(targetTile) + Math.random()) * Settings.TILE_SIZE;
            info.tileTargetPosition = new Point(x, y);
            moveSpeed = FLESH_SWORD_WANDER_MOVE_SPEED;
            wiggleSpeed = 1;
         }
      }
   }

   if (targetPositionX !== -1) {
      info.internalWiggleTicks += wiggleSpeed!;
      
      const directMoveAngle = angle(targetPositionX - transformComponent.position.x, targetPositionY - transformComponent.position.y);

      const moveAngleOffset = Math.sin(info.internalWiggleTicks / Settings.TPS * 10) * Math.PI * 0.2;

      const physicsComponent = PhysicsComponentArray.getComponent(itemEntity);

      // @Hack: should instead change angularvelocity
      const moveAngle = directMoveAngle + moveAngleOffset;
      transformComponent.rotation = moveAngle - Math.PI/4;
      physicsComponent.selfVelocity.x = moveSpeed! * Math.sin(moveAngle);
      physicsComponent.selfVelocity.y = moveSpeed! * Math.cos(moveAngle);

      physicsComponent.hitboxesAreDirty = true;
   }
}

export function addFleshSword(itemEntity: EntityID): void {
   FLESH_SWORD_INFO[itemEntity] = {
      internalWiggleTicks: 0,
      tileTargetPosition: null
   };
}

export function removeFleshSword(entity: EntityID): void {
   delete FLESH_SWORD_INFO[entity];
}