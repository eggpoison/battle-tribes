import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { Point } from "webgl-test-shared/dist/utils";
import { HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { Hitbox } from "./hitboxes";

export const enum HitboxFlags {
   NON_GRASS_BLOCKING = 1 << 0
}

export type HitboxObject = { position: Point, rotation: number };

export type HitboxBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class BaseHitbox {
   /** Unique identifier in its entities' hitboxes */
   public readonly localID: number;

   public position!: Point;
   
   public readonly mass: number;
   public offsetX: number;
   public offsetY: number;

   // @Memory: Would be great to remove this
   public chunkBounds: HitboxBounds = [-1, -1, -1, -1];

   public collisionType: HitboxCollisionType;
   public readonly collisionBit: HitboxCollisionBit;
   public readonly collisionMask: number;

   public flags = 0;

   constructor(parentPosition: Point, mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, localID: number, initialRotation: number, collisionBit: number, collisionMask: number) {
      this.mass = mass;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      this.collisionType = collisionType;
      this.localID = localID;
      this.collisionBit = collisionBit;
      this.collisionMask = collisionMask;

      this.updatePosition(parentPosition.x, parentPosition.y, initialRotation);
   }

   public updatePosition(parentX: number, parentY: number, parentRotation: number): void {
      const cosRotation = Math.cos(parentRotation);
      const sinRotation = Math.sin(parentRotation);
      
      const x = parentX + cosRotation * this.offsetX + sinRotation * this.offsetY;
      const y = parentY + cosRotation * this.offsetY - sinRotation * this.offsetX;
      this.position = new Point(x, y);
   }

   public abstract calculateHitboxBoundsMinX(): number;
   public abstract calculateHitboxBoundsMaxX(): number;
   public abstract calculateHitboxBoundsMinY(): number;
   public abstract calculateHitboxBoundsMaxY(): number;

   public abstract isColliding(otherHitbox: Hitbox): boolean;
}

export default BaseHitbox;