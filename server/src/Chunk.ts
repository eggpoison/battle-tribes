import { RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneData } from "battletribes-shared/client-server-types";
import { GrassBlocker } from "battletribes-shared/grass-blockers";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { distance } from "battletribes-shared/utils";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { TransformComponentArray } from "./components/TransformComponent";
import { surfaceLayer } from "./world";

// @Cleanup: location
export function entityIsCollisionRelevant(entity: EntityID): boolean {
   // @Incomplete: account for entities which have no physics component but have collision events

   if (PhysicsComponentArray.hasComponent(entity)) {
      return true;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   return transformComponent.totalMass > 0;
}

class Chunk {
   /** Stores all entities inside the chunk */
   public readonly entities = new Array<EntityID>();

   /** All collision relevant entities in the chunk */
   public readonly collisionRelevantEntities = new Array<EntityID>();
   /** All collision relevant entities in the chunk with a physics component */
   public readonly collisionRelevantPhysicsEntities = new Array<EntityID>();

   /** Stores all mobs which have the chunk in their vision range */
   public readonly viewingEntities = new Array<EntityID>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   public readonly grassBlockers = new Array<GrassBlocker>();
   
   public hasWallTiles = false;
}

export default Chunk;

// @Cleanup: Should this be here?
export function isTooCloseToSteppingStone(x: number, y: number, checkRadius: number): boolean {
   const minChunkX = Math.max(Math.min(Math.floor((x - checkRadius) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((x + checkRadius) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((y - checkRadius) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((y + checkRadius) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = surfaceLayer.getChunk(chunkX, chunkY);

         for (const steppingStone of chunk.riverSteppingStones) {
            const dist = distance(x, y, steppingStone.positionX, steppingStone.positionY) - RIVER_STEPPING_STONE_SIZES[steppingStone.size] * 0.5;
            
            if (dist < checkRadius) {
               return true;
            }
         }
      }
   }

   return false;
}