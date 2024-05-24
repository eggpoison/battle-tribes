import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { HitboxVertexPositions, circleAndRectangleDoIntersect, rectanglesAreColliding } from "webgl-test-shared/dist/collision";
import { Point } from "webgl-test-shared/dist/utils";
import BaseHitbox from "./BaseHitbox";
import { Hitbox, hitboxIsCircular } from "./hitboxes";

// @Cleanup: remove the need to have this
export function assertIsRectangular(hitbox: BaseHitbox): asserts hitbox is RectangularHitbox {
   // @Speed
   if (hitbox.hasOwnProperty("radius")) {
      throw new Error();
   }
}

class RectangularHitbox extends BaseHitbox {
   public width: number;
   public height: number;
   
   /** The rotation of the hitbox relative to its game object */
   public relativeRotation: number;
   public rotation!: number;

   // @Memory: Only need to calculate the top left and top right ones
   public vertexOffsets: HitboxVertexPositions = [new Point(0, 0), new Point(0, 0), new Point(0, 0), new Point(0, 0)];

   public axisX = 0;
   public axisY = 0;

   constructor(parentPosition: Point, mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, localID: number, parentRotation: number, width: number, height: number, rotation: number, collisionBit: number, collisionMask: number) {
      super(parentPosition, mass, offsetX, offsetY, collisionType, localID, parentRotation, collisionBit, collisionMask);

      this.width = width;
      this.height = height;
      this.relativeRotation = rotation;
      this.updateRotationAndVertexPositionsAndSideAxes(parentRotation);
   }

   // @Cleanup: long ass name
   public updateRotationAndVertexPositionsAndSideAxes(parentRotation: number): void {
      const rotation = this.relativeRotation + parentRotation;
      this.rotation = rotation;
      
      const x1 = -this.width * 0.5;
      const x2 = this.width * 0.5;
      const y2 = this.height * 0.5;

      const sinRotation = Math.sin(rotation);
      const cosRotation = Math.cos(rotation);

      // Rotate vertices

      // Top left vertex
      this.vertexOffsets[0].x = cosRotation * x1 + sinRotation * y2;
      this.vertexOffsets[0].y = cosRotation * y2 - sinRotation * x1;
      // Top right vertex
      this.vertexOffsets[1].x = cosRotation * x2 + sinRotation * y2;
      this.vertexOffsets[1].y = cosRotation * y2 - sinRotation * x2;
      // Bottom right vertex
      this.vertexOffsets[2].x = -this.vertexOffsets[0].x;
      this.vertexOffsets[2].y = -this.vertexOffsets[0].y;
      // Bottom left vertex
      this.vertexOffsets[3].x = -this.vertexOffsets[1].x;
      this.vertexOffsets[3].y = -this.vertexOffsets[1].y;

      // Angle between vertex 0 (top left) and vertex 1 (top right)
      // @Speed: If we do a different axis, can we get rid of the minus?
      this.axisX = cosRotation;
      this.axisY = -sinRotation;
   }

   public calculateHitboxBoundsMinX(): number {
      return this.position.x + Math.min(this.vertexOffsets[0].x, this.vertexOffsets[1].x, this.vertexOffsets[2].x, this.vertexOffsets[3].x);
   }
   public calculateHitboxBoundsMaxX(): number {
      return this.position.x + Math.max(this.vertexOffsets[0].x, this.vertexOffsets[1].x, this.vertexOffsets[2].x, this.vertexOffsets[3].x);
   }
   public calculateHitboxBoundsMinY(): number {
      return this.position.y + Math.min(this.vertexOffsets[0].y, this.vertexOffsets[1].y, this.vertexOffsets[2].y, this.vertexOffsets[3].y);
   }
   public calculateHitboxBoundsMaxY(): number {
      return this.position.y + Math.max(this.vertexOffsets[0].y, this.vertexOffsets[1].y, this.vertexOffsets[2].y, this.vertexOffsets[3].y);
   }

   public isColliding(otherHitbox: Hitbox): boolean {
      if (hitboxIsCircular(otherHitbox)) {
         // Circular hitbox
         return circleAndRectangleDoIntersect(otherHitbox.position, otherHitbox.radius, this.position, this.width, this.height, this.rotation);
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
         
         const collisionData = rectanglesAreColliding(this.vertexOffsets, otherHitbox.vertexOffsets, this.position, otherHitbox.position, this.axisX, this.axisY, otherHitbox.axisX, otherHitbox.axisY);
         return collisionData.isColliding;
      }
   }
}

export default RectangularHitbox;