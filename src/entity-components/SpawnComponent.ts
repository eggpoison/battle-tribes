import Board, { TileCoordinates } from "../Board";
import Component from "../Component";
import { TileType } from "../tiles";

/** Responsible for spawning entities */
class SpawnComponent extends Component {
   private static spawnableTiles: { [key: string]: Array<TileCoordinates> } = {};

   public static getSpawnableTiles(id: string, spawnableTileTypes?: Array<TileType>): Array<TileCoordinates> {
      if (!this.spawnableTiles.hasOwnProperty(id)) {
         if (typeof spawnableTileTypes === "undefined") {
            throw new Error("Parameter 'spawnableTileTypes' is undefined, but has to be used in generating tiles!");
         }
         
         this.spawnableTiles[id] = this.generateSpawnableTiles(spawnableTileTypes);
      }
      return this.spawnableTiles[id];
   }

   private static generateSpawnableTiles(spawnableTileTypes: Array<TileType>): Array<TileCoordinates> {
      const spawnableTiles = new Array<TileCoordinates>();

      for (let y = 0; y < Board.dimensions; y++) {
         for (let x = 0; x < Board.dimensions; x++) {
            const tileType = Board.getTileType(x, y);

            if (spawnableTileTypes.includes(tileType)) {
               spawnableTiles.push([x, y]);
            }
         }
      }

      return spawnableTiles;
   }
}

export default SpawnComponent;