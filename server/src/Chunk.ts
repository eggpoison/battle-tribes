import { Entity } from "battletribes-shared";
import { GrassBlocker } from "./grass-blockers.js";

// @Cleanup @Memory: A lot of these properties aren't used by collision chunks
class Chunk {
   /** Stores all entities inside the chunk */
   public readonly entities: Array<Entity> = [];

   /** Stores all mobs which have the chunk in their vision range */
   public readonly viewingEntities: Array<Entity> = [];

   public readonly grassBlockers: Array<GrassBlocker> = [];
   
   public hasWallTiles = false;
}

export default Chunk;