import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { circlesDoIntersect, circleAndRectangleDoIntersect } from "webgl-test-shared/dist/collision";
import BaseHitbox from "./BaseHitbox";
import { Point } from "webgl-test-shared/dist/utils";
import { Hitbox, hitboxIsCircular } from "./hitboxes";

class CircularHitbox extends BaseHitbox {
   public radius: number;

   constructor(parentPosition: Point, mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, radius: number, localID: number, initialParentRotation: number, collisionBit: number, collisionMask: number) {
      super(parentPosition, mass, offsetX, offsetY, collisionType, localID, initialParentRotation, collisionBit, collisionMask);

      this.radius = radius;
   }

   public calculateHitboxBoundsMinX(): number {
      return this.x - this.radius;
   }
   public calculateHitboxBoundsMaxX(): number {
      return this.x + this.radius;
   }
   public calculateHitboxBoundsMinY(): number {
      return this.y - this.radius;
   }
   public calculateHitboxBoundsMaxY(): number {
      return this.y + this.radius;
   }

   public isColliding(otherHitbox: Hitbox): boolean {
      if (hitboxIsCircular(otherHitbox)) {
         // Circular hitbox
         return circlesDoIntersect(this.x, this.y, this.radius, otherHitbox.x, otherHitbox.y, otherHitbox.radius);
      } else {
         // Rectangular hitbox
         return circleAndRectangleDoIntersect(this.x, this.y, this.radius, otherHitbox.x, otherHitbox.y, otherHitbox.width, otherHitbox.height, otherHitbox.rotation);
      }
   }
}

export default CircularHitbox;