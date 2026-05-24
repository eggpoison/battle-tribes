import { getCircleCircleCollisionResult, getCircleRectangleCollisionResult, CollisionResult } from "../collision.js";
import { _bounds, BaseBox } from "./BaseBox.js";
import { Box, boxIsCircular } from "./boxes.js";

export class CircularBox extends BaseBox {
   public radius: number;

   constructor(posX: number, posY: number, offsetX: number, offsetY: number, angle: number, radius: number) {
      super(posX, posY, offsetX, offsetY, angle);
      this.radius = radius;
   }

   public calculateBounds(): void {
      _bounds.minX = this.posX - this.radius;
      _bounds.maxX = this.posX + this.radius;
      _bounds.minY = this.posY - this.radius;
      _bounds.maxY = this.posY + this.radius;
   }

   public getCollisionResult(otherHitbox: Box, epsilon: number = 0): CollisionResult {
      if (boxIsCircular(otherHitbox)) {
         // Circular hitbox
         return getCircleCircleCollisionResult(this.posX, this.posY, this.radius * this.scale - epsilon, otherHitbox.posX, otherHitbox.posY, otherHitbox.radius * otherHitbox.scale - epsilon);
      } else {
         // Rectangular hitbox
         return getCircleRectangleCollisionResult(this.posX, this.posY, this.radius - epsilon, otherHitbox.posX, otherHitbox.posY, otherHitbox.width - epsilon * 0.5, otherHitbox.height - epsilon * 0.5, otherHitbox.angle);
      }
   }
}