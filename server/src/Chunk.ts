import { RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneData } from "webgl-test-shared/dist/client-server-types";
import { GrassBlocker } from "webgl-test-shared/dist/grass-blockers";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { distance } from "webgl-test-shared/dist/utils";
import Board from "./Board";

class Chunk {
   /** Stores all entities inside the chunk */
   public readonly entities = new Array<EntityID>();
   /** All entities in the chunk with a physics component */
   public readonly physicsEntities = new Array<EntityID>();

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
         const chunk = Board.getChunk(chunkX, chunkY);

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