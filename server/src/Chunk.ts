import { RiverSteppingStoneData } from "webgl-test-shared/dist/client-server-types";
import Entity from "./Entity";

// @Speed: Change from array-of-objects to object-of-arrays

class Chunk {
   /** Stores all game objects inside the chunk */
   public readonly entities = new Array<Entity>();

   /** Stores all mobs which have the chunk in their vision range */
   public readonly viewingEntities = new Array<Entity>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   public hasWallTiles = false;
}

export default Chunk;