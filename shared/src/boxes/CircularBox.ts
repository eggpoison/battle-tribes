import { getCircleCircleCollisionResult, getCircleRectangleCollisionResult, CollisionResult } from "../collision";
import { Point } from "../utils";
import { _bounds, BaseBox } from "./BaseBox";
import { Box, boxIsCircular } from "./boxes";

export class CircularBox extends BaseBox {
   public radius: number;

   constructor(position: Point, offset: Point, angle: number, radius: number) {
      super(position, offset, angle);
      this.radius = radius;
   }

   public calculateBounds(): void {
      _bounds.minX = this.position.x - this.radius;
      _bounds.maxX = this.position.x + this.radius;
      _bounds.minY = this.position.y - this.radius;
      _bounds.maxY = this.position.y + this.radius;
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