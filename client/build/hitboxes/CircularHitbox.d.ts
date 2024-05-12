import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import Hitbox from "./Hitbox";
declare class CircularHitbox extends Hitbox {
    radius: number;
    constructor(mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, localID: number, radius: number);
    updateHitboxBounds(): void;
    isColliding(otherHitbox: Hitbox): boolean;
}
export default CircularHitbox;
