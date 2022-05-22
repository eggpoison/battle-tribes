import Board, { Coordinates } from "../Board";
import Component from "../Component";
import { TileKind } from "../tile-types";

/** Responsible for spawning entities */
class SpawnerComponent extends Component {
   private static spawnableTiles: { [key: string]: Array<Coordinates> } = {};

   public static getSpawnableTiles(id: string, spawnableTileTypes?: Array<TileKind>): Array<Coordinates> {
      if (!this.spawnableTiles.hasOwnProperty(id)) {
         if (typeof spawnableTileTypes === "undefined") {
            throw new Error("Parameter 'spawnableTileTypes' is undefined, but has to be used in generating tiles!");
         }
         
         this.spawnableTiles[id] = this.generateSpawnableTiles(spawnableTileTypes);
      }
      return this.spawnableTiles[id];
   }

   private static generateSpawnableTiles(spawnableTileTypes: Array<TileKind>): Array<Coordinates> {
      const spawnableTiles = new Array<Coordinates>();

      for (let y = 0; y < Board.dimensions; y++) {
         for (let x = 0; x < Board.dimensions; x++) {
            const tile = Board.getTile(x, y);

            if (spawnableTileTypes.includes(tile.kind)) {
               spawnableTiles.push([x, y]);
            }
         }
      }

      return spawnableTiles;
   }
}

export default SpawnerComponent;