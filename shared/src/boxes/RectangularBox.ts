import { CollisionResult, getCircleRectangleCollisionResult, rectanglesAreColliding } from "../collision";
import { Point } from "../utils";
import { _bounds, BaseBox } from "./BaseBox";
import { Box, boxIsCircular, updateSideAxes } from "./boxes";

/*
   @Temporary
   might be useful idk

   const x1 = -box.width * box.scale * 0.5;
   const x2 = box.width * box.scale * 0.5;
   const y2 = box.height * box.scale * 0.5;
   box.topLeftVertexOffset.x = cosRotation * x1 + sinRotation * y2;
   box.topLeftVertexOffset.y = cosRotation * y2 - sinRotation * x1;
   box.topRightVertexOffset.x = cosRotation * x2 + sinRotation * y2;
   box.topRightVertexOffset.y = cosRotation * y2 - sinRotation * x2;
*/

export class RectangularBox extends BaseBox {
   public width: number;
   public height: number;

   public axisX = 0;
   public axisY = 0;

   constructor(position: Point, offset: Point, angle: number, width: number, height: number) {
      super(position, offset, angle);

      this.width = width;
      this.height = height;

      updateSideAxes(this);
   }

   public calculateBounds(): void {
      const xxa = this.axisX * this.width;
      const xya = this.axisY * this.height;
      const halfX = Math.max(Math.abs(xxa + xya), Math.abs(xxa - xya)) * this.scale * 0.5;

      const yxa = this.axisX * this.height;
      const yya = this.axisY * this.width;
      const halfY = Math.max(Math.abs(yxa - yya), Math.abs(yxa + yya)) * this.scale * 0.5;

      const x = this.position.x;
      const y = this.position.y;
      _bounds.minX = x - halfX;
      _bounds.maxX = x + halfX;
      _bounds.minY = y - halfY;
      _bounds.maxY = y + halfY;
   }

   // @Hack
   public getTopLeftVertexOffset(): Point {
      const tlX = (this.axisX * -this.width - this.axisY * this.height) * this.scale * 0.5;
      const tlY = (this.axisX * this.height + this.axisY * -this.width) * this.scale * 0.5;
      return new Point(tlX, tlY);
   }

   // @Hack
   public getTopRightVertexOffset(): Point {
      const tlX = (this.axisX * this.width - this.axisY * this.height) * this.scale * 0.5;
      const tlY = (this.axisX * this.height + this.axisY * this.width) * this.scale * 0.5;
      return new Point(tlX, tlY);
   }

   public getCollisionResult(otherHitbox: Box, epsilon: number = 0): CollisionResult {
      if (boxIsCircular(otherHitbox)) {
         // Circular hitbox
         const collisionResult = getCircleRectangleCollisionResult(otherHitbox.position, otherHitbox.radius * otherHitbox.scale - epsilon, this.position, this.width * this.scale - epsilon * 0.5, this.height * this.scale - epsilon * 0.5, this.angle);
         collisionResult.overlap.x *= -1;
         collisionResult.overlap.y *= -1;
         return collisionResult;
      } else {
         // Rectangular hitbox

         const diffX = this.position.x - otherHitbox.position.x;
         const diffY = this.position.y - otherHitbox.position.y;
         
         const width1Squared = this.width * this.scale * this.width * this.scale;
         const height1Squared = this.height * this.scale * this.height * this.scale;
         // @Incomplete: doesn't account for scale?
         const width2Squared = otherHitbox.width * otherHitbox.width;
         const height2Squared = otherHitbox.height * otherHitbox.height;

         // If the distance between the entities is greater than the sum of their half diagonals then they can never collide
         if (diffX * diffX + diffY * diffY > (width1Squared + height1Squared + width2Squared + height2Squared + 2 * Math.sqrt((width1Squared + height1Squared) * (width2Squared + height2Squared))) * 0.25) {
            return {
               isColliding: false,
               overlap: new Point(0, 0),
               collisionPoint: new Point(0, 0)
            };
         }

         const thisWidthBefore = this.width;
         const thisHeightBefore = this.height;
         
         if (epsilon > 0) {
            this.width -= epsilon * 0.5;
            this.height -= epsilon * 0.5;
         }
         
         const collisionResult = rectanglesAreColliding(this, otherHitbox);

         if (epsilon > 0) {
            this.width = thisWidthBefore;
            this.height = thisHeightBefore;
         }
         
         return collisionResult;
      }
   }
}