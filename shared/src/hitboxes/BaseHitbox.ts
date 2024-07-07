import { HitboxCollisionBit } from "../collision";
import { Point } from "../utils";
import { HitboxCollisionType, Hitbox } from "./hitboxes";

abstract class BaseHitbox {
   public readonly position = new Point(0, 0);
   
   public mass: number;
   public readonly offset: Point;

   public collisionType: HitboxCollisionType;
   public readonly collisionBit: HitboxCollisionBit;
   public readonly collisionMask: number;

   public readonly flags: number;

   constructor(mass: number, offset: Point, collisionType: HitboxCollisionType, collisionBit: number, collisionMask: number, flags: number) {
      this.mass = mass;
      this.offset = offset;
      this.collisionType = collisionType;
      this.collisionBit = collisionBit;
      this.collisionMask = collisionMask;
      this.flags = flags;
   }

   public abstract calculateHitboxBoundsMinX(): number;
   public abstract calculateHitboxBoundsMaxX(): number;
   public abstract calculateHitboxBoundsMinY(): number;
   public abstract calculateHitboxBoundsMaxY(): number;

   public abstract isColliding(otherHitbox: Hitbox, epsilon?: number): boolean;
}

export default BaseHitbox;