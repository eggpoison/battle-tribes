import { Point } from "webgl-test-shared/dist/utils";
import { HitboxVertexPositions } from "webgl-test-shared/dist/collision-detection";
import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import Hitbox from "./Hitbox";
import CircularHitbox from "./CircularHitbox";
import Entity from "../Entity";
declare class RectangularHitbox extends Hitbox {
    width: number;
    height: number;
    rotation: number;
    externalRotation: number;
    /** Length of half of the diagonal of the rectangle */
    halfDiagonalLength: number;
    vertexPositions: HitboxVertexPositions;
    sideAxes: readonly [Point, Point];
    constructor(mass: number, offsetX: number, offsetY: number, collisionType: HitboxCollisionType, localID: number, width: number, height: number, rotation: number);
    recalculateHalfDiagonalLength(): void;
    updateFromEntity(gameObject: Entity): void;
    private computeVertexPositions;
    computeSideAxes(offsetRotation: number): void;
    updateHitboxBounds(offsetRotation: number): void;
    isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean;
}
export default RectangularHitbox;
