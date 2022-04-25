import Board, { Chunk, TileCoordinates } from "../Board";
import Component from "../Component";
import { Point, Vector } from "../utils";
import HitboxComponent from "./HitboxComponent";

interface Size {
   readonly width: number;
   readonly height: number;
}

class TransformComponent extends Component {
   public readonly size: Size;

   public position: Point;
   public velocity: Vector;

   constructor(startingPosition: Point, width: number, height: number) {
      super();

      this.size = {
         width: width,
         height: height
      };

      this.position = startingPosition;
      this.velocity = new Vector(0, 0);
   }

   public tick(): void {
      // If the entity has a hitbox, check if it will collide first
      const entity = this.getEntity();
      if (entity.hasComponent(HitboxComponent)) {
         const hitboxComponent = entity.getComponent(HitboxComponent);

         if (hitboxComponent.willCollideWithWall()) return;
      }
      
      const positionAdd = this.velocity.convertToPoint();
      this.position = this.position.add(positionAdd);
   }

   public getChunk(): Chunk {
      const chunkX = Math.floor(this.position.x / (Board.tileSize * Board.size));
      const chunkY = Math.floor(this.position.y / (Board.tileSize * Board.size));

      return Board.getChunk(chunkX, chunkY);
   }

   public static getRandomPositionInTile(tileCoordinates: TileCoordinates): Point {
      const x = tileCoordinates[0] * Board.tileSize + Board.tileSize * Math.random();
      const y = tileCoordinates[1] * Board.tileSize + Board.tileSize * Math.random();

      return new Point(x, y);
   }
}

export default TransformComponent;