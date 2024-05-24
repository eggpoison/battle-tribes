import { circleAndRectangleDoIntersect, circlesDoIntersect } from "webgl-test-shared/dist/collision";
import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import BaseHitbox from "./BaseHitbox";
import { Hitbox, hitboxIsCircular } from "./hitboxes";

class CircularHitbox extends BaseHitbox {
   public radius: number;

   constructor(mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, localID: number, radius: number) {
      super(mass, offsetX, offsetY, collisionType, localID);
      
      this.radius = radius;
   }
   
   public updateHitboxBounds(): void {
      this.bounds[0] = this.position.x - this.radius;
      this.bounds[1] = this.position.x + this.radius;
      this.bounds[2] = this.position.y - this.radius;
      this.bounds[3] = this.position.y + this.radius;
   }

   public isColliding(otherHitbox: Hitbox): boolean {
      if (hitboxIsCircular(otherHitbox)) {
         // Circular hitbox
         return circlesDoIntersect(this.position, this.radius, otherHitbox.position, otherHitbox.radius);
      } else {
         // Rectangular hitbox
         return circleAndRectangleDoIntersect(this.position, this.radius, otherHitbox.position, otherHitbox.width, otherHitbox.height, otherHitbox.rotation + otherHitbox.externalRotation);
      }
   }
}

export default CircularHitbox;   