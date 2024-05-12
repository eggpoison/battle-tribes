import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { Point } from "webgl-test-shared/dist/utils";
import RectangularHitbox from "./RectangularHitbox";
import CircularHitbox from "./CircularHitbox";

export type HitboxObject = { position: Point, rotation: number };

export type HitboxBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class Hitbox {
   /** Unique identifier in its entities' hitboxes */
   public readonly localID: number;

   public x!: number;
   public y!: number;
   
   public readonly mass: number;
   public offsetX: number;
   public offsetY: number;

   // @Memory: Would be great to remove this
   public chunkBounds: HitboxBounds = [-1, -1, -1, -1];

   public collisionType: HitboxCollisionType;

   constructor(parentX: number, parentY: number, mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, localID: number, initialRotation: number) {
      this.mass = mass;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      this.collisionType = collisionType;
      this.localID = localID;

      this.updatePosition(parentX, parentY, initialRotation);
   }

   public updatePosition(parentX: number, parentY: number, parentRotation: number): void {
      const cosRotation = Math.cos(parentRotation);
      const sinRotation = Math.sin(parentRotation);
      
      this.x = parentX + cosRotation * this.offsetX + sinRotation * this.offsetY;
      this.y = parentY + cosRotation * this.offsetY - sinRotation * this.offsetX;
   }

   public abstract calculateHitboxBoundsMinX(): number;
   public abstract calculateHitboxBoundsMaxX(): number;
   public abstract calculateHitboxBoundsMinY(): number;
   public abstract calculateHitboxBoundsMaxY(): number;

   public abstract isColliding(otherHitbox: RectangularHitbox | CircularHitbox): boolean;
}

export default Hitbox;