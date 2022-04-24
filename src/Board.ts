import Entity from "./Entity";
import { TileType } from "./tiles";

type Chunk = Array<Entity>;

abstract class Board {
   /** The width and height of the board in chunks */
   public static size: number = 8;
   /** The width and height of a chunk in cells */
   public static chunkSize: number = 8;

   private static chunks: Array<Array<Chunk>>;

   private static tiles: Array<Array<TileType>>;

   public static setup(): void {
      const boardDimensions = this.size * this.chunkSize;

      this.tiles = new Array<Array<TileType>>(boardDimensions);

      for (let row of this.tiles) {
         row = new Array<TileType>(boardDimensions);
      }
   }
}

export default Board;