import { RiverSteppingStoneData } from "webgl-test-shared/dist/client-server-types";
import { GrassBlocker } from "webgl-test-shared/dist/grass-blockers";
import { EntityID } from "webgl-test-shared/dist/entities";

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