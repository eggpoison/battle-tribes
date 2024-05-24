import { circlesDoIntersect, circleAndRectangleDoIntersect } from "webgl-test-shared/dist/collision";
import { Point } from "webgl-test-shared/dist/utils";
import CircularHitbox from "./CircularHitbox";
import RectangularHitbox from "./RectangularHitbox";

export type Hitbox = CircularHitbox | RectangularHitbox;

export function hitboxIsCircular(hitbox: Hitbox): hitbox is CircularHitbox {
   return typeof (hitbox as CircularHitbox).radius !== "undefined";
}

// @Cleanup: should this be here?
export function hitboxIsWithinRange(position: Point, hitbox: Hitbox, visionRange: number): boolean {
   if (hitboxIsCircular(hitbox)) {
      // Circular hitbox
      return circlesDoIntersect(position, visionRange, hitbox.position, hitbox.radius);
   } else {
      // Rectangular hitbox
      return circleAndRectangleDoIntersect(position, visionRange, hitbox.position, hitbox.width, hitbox.height, hitbox.rotation + hitbox.externalRotation);
   }
}