import { getCircleCircleCollisionResult, getCircleRectangleCollisionResult, CollisionResult } from "../collision";
import { Point } from "../utils";
import { BaseBox } from "./BaseBox";
import { Box, boxIsCircular } from "./boxes";

export class CircularBox extends BaseBox {
   public radius: number;

   constructor(position: Point, offset: Point, angle: number, radius: number) {
      super(position, offset, angle);
      this.radius = radius;
   }

   public calculateBoundsMinX(): number {
      return this.position.x - this.radius;
   }
   public calculateBoundsMaxX(): number {
      return this.position.x + this.radius;
   }
   public calculateBoundsMinY(): number {
      return this.position.y - this.radius;
   }
   public calculateBoundsMaxY(): number {
      return this.position.y + this.radius;
   }

   public getCollisionResult(otherHitbox: Box, epsilon: number = 0): CollisionResult {
      if (boxIsCircular(otherHitbox)) {
         // Circular hitbox
         return getCircleCircleCollisionResult(this.position, this.radius * this.scale - epsilon, otherHitbox.position, otherHitbox.radius * otherHitbox.scale - epsilon);
      } else {
         // Rectangular hitbox
         return getCircleRectangleCollisionResult(this.position, this.radius - epsilon, otherHitbox.position, otherHitbox.width - epsilon * 0.5, otherHitbox.height - epsilon * 0.5, otherHitbox.angle);
      }
   }
}