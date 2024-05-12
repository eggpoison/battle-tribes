import { Point } from "webgl-test-shared/dist/utils";
import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import CircularHitbox from "./CircularHitbox";
import RectangularHitbox from "./RectangularHitbox";
import Entity from "../Entity";
export type HitboxBounds = [minX: number, maxX: number, minY: number, maxY: number];
declare abstract class Hitbox {
    readonly localID: number;
    readonly mass: number;
    collisionType: HitboxCollisionType;
    /** The position of the hitbox, accounting for its offset and offset rotation */
    position: Point;
    offset: Point;
    /** The bounds of the hitbox since the last physics update */
    bounds: HitboxBounds;
    constructor(mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, localID: number);
    abstract updateHitboxBounds(offsetRotation: number): void;
    updateFromEntity(entity: Entity): void;
    abstract isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean;
}
export default Hitbox;
