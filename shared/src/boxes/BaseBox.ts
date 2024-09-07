import { Point } from "../utils";
import { Box } from "./boxes";

abstract class BaseBox {
   public readonly position = new Point(0, 0);
   
   public readonly offset: Point;

   constructor(offset: Point) {
      this.offset = offset;
   }

   public abstract calculateBoundsMinX(): number;
   public abstract calculateBoundsMaxX(): number;
   public abstract calculateBoundsMinY(): number;
   public abstract calculateBoundsMaxY(): number;

   public abstract isColliding(otherBox: Box, epsilon?: number): boolean;
}

export default BaseBox;