import { Point } from "../utils";
import { Box } from "./boxes";

abstract class BaseBox {
   public readonly position = new Point(0, 0);
   
   public readonly offset: Point;
   
   // Although it doesn't really make sense for a circle to have rotation, it is useful for propagating changes when a hitbox's parent is a circular hitbox.
   /** The rotation of the hitbox relative to its game object */
   public relativeRotation: number;
   public rotation: number;

   constructor(offset: Point, rotation: number) {
      this.offset = offset;
      
      this.relativeRotation = rotation;
      this.rotation = rotation;
   }

   public abstract calculateBoundsMinX(): number;
   public abstract calculateBoundsMaxX(): number;
   public abstract calculateBoundsMinY(): number;
   public abstract calculateBoundsMaxY(): number;

   public abstract isColliding(otherBox: Box, epsilon?: number): boolean;
}

export default BaseBox;