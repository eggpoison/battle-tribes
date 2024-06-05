import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import CircularHitbox from "./CircularHitbox";
import RectangularHitbox from "./RectangularHitbox";
import Entity from "../Entity";

export type HitboxBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class BaseHitbox {
   public readonly localID: number;
   
   public readonly mass: number;
   public collisionType: HitboxCollisionType;
   
   /** The position of the hitbox, accounting for its offset and offset rotation */
   public position = new Point(0, 0);

   public offset: Point;

   /** The bounds of the hitbox since the last physics update */
   public bounds: HitboxBounds = [-1, -1, -1, -1];

   constructor(mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, localID: number) {
      this.mass = mass;
      this.offset = new Point(offsetX, offsetY);
      this.collisionType = collisionType;
      this.localID = localID;
   }

   public abstract updateHitboxBounds(offsetRotation: number): void;

   public updateFromEntity(entity: Entity): void {
      this.position.x = entity.position.x;
      this.position.y = entity.position.y;

      this.position.x += rotateXAroundPoint(this.offset.x, this.offset.y, 0, 0, entity.rotation);
      this.position.y += rotateYAroundPoint(this.offset.x, this.offset.y, 0, 0, entity.rotation);
   }

   public abstract isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean;
}
 
export default BaseHitbox;