import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import { HitboxVertexPositions, circleAndRectangleDoIntersect, rectanglesAreColliding } from "webgl-test-shared/dist/collision";
import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import BaseHitbox from "./BaseHitbox";
import Entity from "../Entity";
import { Hitbox, hitboxIsCircular } from "./hitboxes";

class RectangularHitbox extends BaseHitbox {
   public width: number;
   public height: number;
   public rotation: number;

   public externalRotation = 0;
   
   /** Length of half of the diagonal of the rectangle */
   public halfDiagonalLength: number;

   public vertexPositions: HitboxVertexPositions = [new Point(-1, -1), new Point(-1, -1), new Point(-1, -1), new Point(-1, -1)];

   public sideAxes = [new Point(0, 0), new Point(0, 0)] as const;

   constructor(mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, localID: number, width: number, height: number, rotation: number) {
      super(mass, offsetX, offsetY, collisionType, localID);
      
      this.width = width;
      this.height = height;
      this.rotation = rotation;
      this.halfDiagonalLength = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
   }

   public recalculateHalfDiagonalLength(): void {
      this.halfDiagonalLength = Math.sqrt(this.width * this.width / 4 + this.height * this.height / 4);
   }

   public updateFromEntity(gameObject: Entity): void {
      super.updateFromEntity(gameObject);
      this.externalRotation = gameObject.rotation;
   }

   private computeVertexPositions(offsetRotation: number): void {
      const x1 = this.position.x - this.width / 2;
      const x2 = this.position.x + this.width / 2;
      const y1 = this.position.y - this.height / 2;
      const y2 = this.position.y + this.height / 2;

      // Top left
      this.vertexPositions[0].x = rotateXAroundPoint(x1, y2, this.position.x, this.position.y, this.rotation + offsetRotation);
      this.vertexPositions[0].y = rotateYAroundPoint(x1, y2, this.position.x, this.position.y, this.rotation + offsetRotation);
      // Top right
      this.vertexPositions[1].x = rotateXAroundPoint(x2, y2, this.position.x, this.position.y, this.rotation + offsetRotation);
      this.vertexPositions[1].y = rotateYAroundPoint(x2, y2, this.position.x, this.position.y, this.rotation + offsetRotation);
      // Bottom right
      this.vertexPositions[2].x = rotateXAroundPoint(x2, y1, this.position.x, this.position.y, this.rotation + offsetRotation);
      this.vertexPositions[2].y = rotateYAroundPoint(x2, y1, this.position.x, this.position.y, this.rotation + offsetRotation);
      // Bottom left
      this.vertexPositions[3].x = rotateXAroundPoint(x1, y1, this.position.x, this.position.y, this.rotation + offsetRotation);
      this.vertexPositions[3].y = rotateYAroundPoint(x1, y1, this.position.x, this.position.y, this.rotation + offsetRotation);
   }

   public computeSideAxes(offsetRotation: number): void {
      const angle1 = this.rotation + offsetRotation + Math.PI/2;
      this.sideAxes[0].x = Math.sin(angle1);
      this.sideAxes[0].y = Math.cos(angle1);
      
      const angle2 = angle1 + Math.PI/2;
      this.sideAxes[1].x = Math.sin(angle2);
      this.sideAxes[1].y = Math.cos(angle2);
   }

   public updateHitboxBounds(offsetRotation: number): void {
      this.computeVertexPositions(offsetRotation);
      this.computeSideAxes(offsetRotation);

      this.bounds[0] = Math.min(this.vertexPositions[0].x, this.vertexPositions[1].x, this.vertexPositions[2].x, this.vertexPositions[3].x);
      this.bounds[1] = Math.max(this.vertexPositions[0].x, this.vertexPositions[1].x, this.vertexPositions[2].x, this.vertexPositions[3].x);
      this.bounds[2] = Math.min(this.vertexPositions[0].y, this.vertexPositions[1].y, this.vertexPositions[2].y, this.vertexPositions[3].y);
      this.bounds[3] = Math.max(this.vertexPositions[0].y, this.vertexPositions[1].y, this.vertexPositions[2].y, this.vertexPositions[3].y);
   }

   public isColliding(otherHitbox: Hitbox): boolean {
      if (hitboxIsCircular(otherHitbox)) {
         // Circular
         return circleAndRectangleDoIntersect(otherHitbox.position, otherHitbox.radius, this.position, this.width, this.height, this.rotation + this.externalRotation);
      } else {
         // Rectangular

         // If the distance between the hitboxes is greater than the sum of their half diagonals then they're not colliding
         const distance = this.position.calculateDistanceBetween(otherHitbox.position);
         if (distance > this.halfDiagonalLength + otherHitbox.halfDiagonalLength) {
            return false;
         }
         
         const collisionData = rectanglesAreColliding(this.vertexPositions, otherHitbox.vertexPositions, new Point(0, 0), new Point(0, 0), this.sideAxes[0].x, this.sideAxes[0].y, otherHitbox.sideAxes[0].x, otherHitbox.sideAxes[0].y);
         return collisionData.isColliding;
      }
   }
}

export default RectangularHitbox;