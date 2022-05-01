import Board from "./Board";
import TribeStash from "./entities/TribeStash";
import Entity from "./entities/Entity";
import { Point, randFloat } from "./utils";

// Tribe members are created through the tribe class
// Other entities such as the player are added to the tribe in their constructor
class Tribe {
   private readonly entities: Array<Entity> = new Array<Entity>();
   public readonly position: Point;
   public readonly stash: TribeStash;

   constructor(position: Point) {
      this.position = position;

      // Create a tribe stash
      this.stash = new TribeStash(this);
      Board.addEntity(this.stash);
      this.addEntityToTribe(this.stash);
   }

   public createTribeMember(): void {
      // TODO: createTribeMember
   }

   public addEntityToTribe(entity: Entity): void {
      this.entities.push(entity);
   }

   public static getPlayerTribeSpawnPosition(): Point {
      /** % of the board in each direction that the player can't spawn in */
      const PADDING = 40;

      const x = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);
      const y = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);

      return new Point(x, y);
   }
}

export default Tribe;