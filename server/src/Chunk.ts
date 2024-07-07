import { RiverSteppingStoneData } from "webgl-test-shared/dist/client-server-types";
import { GrassBlocker } from "webgl-test-shared/dist/grass-blockers";
import { EntityID } from "webgl-test-shared/dist/entities";

// @Speed: Change from array-of-objects to object-of-arrays

class Chunk {
   /** Stores all game objects inside the chunk */
   public readonly entities = new Array<EntityID>();

   /** Stores all mobs which have the chunk in their vision range */
   public readonly viewingEntities = new Array<EntityID>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   public readonly grassBlockers = new Array<GrassBlocker>();
   
   public hasWallTiles = false;
}

export default Chunk;