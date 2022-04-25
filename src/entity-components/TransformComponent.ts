import Board, { Chunk } from "../Board";
import Component from "../Component";
import { Point, Vector } from "../utils";

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
      const positionAdd = this.velocity.convertToPoint();
      this.position = this.position.add(positionAdd);
   }

   public getChunk(): Chunk {
      const chunkX = Math.floor(this.position.x / (Board.tileSize * Board.size));
      const chunkY = Math.floor(this.position.y / (Board.tileSize * Board.size));

      return Board.getChunk(chunkX, chunkY);
   }
}

export default TransformComponent;