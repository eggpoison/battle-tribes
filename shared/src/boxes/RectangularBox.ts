import { circleAndRectangleDoIntersect, rectanglesAreColliding } from "../collision";
import { Point } from "../utils";
import BaseBox from "./BaseBox";
import { Box, boxIsCircular, updateRotationAndVertexPositionsAndSideAxes } from "./boxes";

export type RectangularBoxVertexPositions = [tl: Point, tr: Point, bl: Point, br: Point];

export class RectangularBox extends BaseBox {
   public width: number;
   public height: number;
   
   /** The rotation of the hitbox relative to its game object */
   public relativeRotation: number;
   public rotation: number;

   public topLeftVertexOffset = new Point(0, 0);
   public topRightVertexOffset = new Point(0, 0);

   public axisX = 0;
   public axisY = 0;

   constructor(offset: Point, width: number, height: number, rotation: number) {
      super(offset);

      this.width = width;
      this.height = height;
      this.relativeRotation = rotation;
      this.rotation = rotation;

      updateRotationAndVertexPositionsAndSideAxes(this, 0);
   }

   public calculateBoundsMinX(): number {
      return this.position.x + Math.min(this.topLeftVertexOffset.x, this.topRightVertexOffset.x, -this.topLeftVertexOffset.x, -this.topRightVertexOffset.x);
   }
   public calculateBoundsMaxX(): number {
      return this.position.x + Math.max(this.topLeftVertexOffset.x, this.topRightVertexOffset.x, -this.topLeftVertexOffset.x, -this.topRightVertexOffset.x);
   }
   public calculateBoundsMinY(): number {
      return this.position.y + Math.min(this.topLeftVertexOffset.y, this.topRightVertexOffset.y, -this.topLeftVertexOffset.y, -this.topRightVertexOffset.y);
   }
   public calculateBoundsMaxY(): number {
      return this.position.y + Math.max(this.topLeftVertexOffset.y, this.topRightVertexOffset.y, -this.topLeftVertexOffset.y, -this.topRightVertexOffset.y);
   }

   public isColliding(otherHitbox: Box, epsilon: number = 0): boolean {
      if (boxIsCircular(otherHitbox)) {
         // Circular hitbox
         return circleAndRectangleDoIntersect(otherHitbox.position, otherHitbox.radius - epsilon, this.position, this.width - epsilon * 0.5, this.height - epsilon * 0.5, this.rotation);
      } else {
         // Rectangular hitbox

         const diffX = this.position.x - otherHitbox.position.x;
         const diffY = this.position.y - otherHitbox.position.y;
         
         const width1Squared = this.width * this.width;
         const height1Squared = this.height * this.height;
         const width2Squared = otherHitbox.width * otherHitbox.width;
         const height2Squared = otherHitbox.height * otherHitbox.height;

         // If the distance between the entities is greater than the sum of their half diagonals then they can never collide
         if (diffX * diffX + diffY * diffY > (width1Squared + height1Squared + width2Squared + height2Squared + 2 * Math.sqrt((width1Squared + height1Squared) * (width2Squared + height2Squared))) * 0.25) {
            return false;
         }

         const thisWidthBefore = this.width;
         const thisHeightBefore = this.height;
         
         if (epsilon > 0) {
            this.width -= epsilon * 0.5;
            this.height -= epsilon * 0.5;

            const parentRotation = this.rotation - this.relativeRotation;
            updateRotationAndVertexPositionsAndSideAxes(this, parentRotation);
         }
         
         const collisionData = rectanglesAreColliding(this, otherHitbox);

         if (epsilon > 0) {
            this.width = thisWidthBefore;
            this.height = thisHeightBefore;

            const parentRotation = this.rotation - this.relativeRotation;
            updateRotationAndVertexPositionsAndSideAxes(this, parentRotation);
         }
         
         return collisionData.isColliding;
      }
   }
}

export default RectangularBox;