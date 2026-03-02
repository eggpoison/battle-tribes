import { Entity } from "battletribes-shared/entities";
import { GrassBlocker } from "./grass-blockers";

// @Cleanup @Memory: A lot of these properties aren't used by collision chunks
class Chunk {
   /** Stores all entities inside the chunk */
   public readonly entities = new Array<Entity>();

   /** Stores all mobs which have the chunk in their vision range */
   public readonly viewingEntities = new Array<Entity>();

   public readonly grassBlockers = new Array<GrassBlocker>();
   
   public hasWallTiles = false;
}

export default Chunk;