import { Point } from "./utils";
export declare const COLLISION_BITS: {
    default: number;
    cactus: number;
    none: number;
    iceSpikes: number;
    plants: number;
    planterBox: number;
};
export declare const DEFAULT_COLLISION_MASK: number;
export type HitboxVertexPositions = [tl: Point, tr: Point, bl: Point, br: Point];
export declare function circlesDoIntersect(circle1x: number, circle1y: number, radius1: number, circle2x: number, circle2y: number, radius2: number): boolean;
/** Checks if a circle and rectangle are intersecting */
export declare function circleAndRectangleDoIntersect(circlePosX: number, circlePosY: number, circleRadius: number, rectPosX: number, rectPosY: number, rectWidth: number, rectHeight: number, rectRotation: number): boolean;
/** Computes the axis for the line created by two points */
export declare function computeSideAxis(point1: Point, point2: Point): Point;
/** Allows for precomputation of points for optimization */
export declare function rectanglePointsDoIntersect(vertexPositions1: HitboxVertexPositions, vertexPositions2: HitboxVertexPositions, offset1x: number, offset1y: number, offset2x: number, offset2y: number, axis1x: number, axis1y: number, axis2x: number, axis2y: number): boolean;
