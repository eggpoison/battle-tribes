export type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};
/**
 * Returns a random integer inclusively.
 * @param min The minimum value of the random number.
 * @param max The maximum value of the random number.
 * @returns A random integer between the min and max values.
 */
export declare function randInt(min: number, max: number): number;
export declare function randFloat(min: number, max: number): number;
export declare class Point {
    x: number;
    y: number;
    constructor(x: number, y: number);
    add(other: Point): void;
    subtract(other: Point): void;
    calculateDotProduct(other: Point): number;
    calculateDistanceBetween(other: Point): number;
    calculateDistanceSquaredBetween(other: Point): number;
    calculateAngleBetween(other: Point): number;
    convertToVector(other?: Point): Vector;
    copy(): Point;
    length(): number;
    lengthSquared(): number;
    package(): [number, number];
    static unpackage(packagedPoint: [number, number]): Point;
    static fromVectorForm(magnitude: number, direction: number): Point;
}
export declare class Vector {
    magnitude: number;
    direction: number;
    constructor(magnitude: number, direction: number);
    convertToPoint(): Point;
    add(other: Vector): void;
    subtract(other: Vector): void;
    copy(): Vector;
    static randomUnitVector(): Vector;
    package(): [number, number];
    normalise(): void;
    static unpackage(packagedVector: [number, number]): Vector;
}
export declare function lerp(start: number, end: number, amount: number): number;
export declare function randItem<T>(arr: Array<T> | ReadonlyArray<T>): T;
export declare function flipAngle(angle: number): number;
export declare function rotateXAroundPoint(x: number, y: number, pivotX: number, pivotY: number, rotation: number): number;
export declare function rotateYAroundPoint(x: number, y: number, pivotX: number, pivotY: number, rotation: number): number;
export declare function rotateXAroundOrigin(x: number, y: number, rotation: number): number;
export declare function rotateYAroundOrigin(x: number, y: number, rotation: number): number;
export declare function rotatePoint(point: Point, pivotPoint: Point, rotation: number): Point;
export declare function roundNum(num: number, dp: number): number;
/**
 * Calculates the curved weight of a given weight value from 0-1
 * Note: the power param must be above 0
 * */
export declare function curveWeight(baseWeight: number, power: number, flatWeight?: number): number;
export declare function veryBadHash(seed: string): number;
export declare function clampToBoardDimensions(tileCoord: number): number;
export declare function clamp(num: number, min: number, max: number): number;
export declare function randSign(): number;
export declare function distance(x1: number, y1: number, x2: number, y2: number): number;
export declare function calculateDistanceSquared(x1: number, y1: number, x2: number, y2: number): number;
export declare function angle(x: number, y: number): number;
export declare function customTickIntervalHasPassed(ticks: number, intervalSeconds: number): boolean;
export declare function distToSegment(p: Point, v: Point, w: Point): number;
export declare function pointIsInRectangle(pointX: number, pointY: number, rectPosX: number, rectPosY: number, rectWidth: number, rectHeight: number, rectRotation: number): boolean;
export declare function smoothstep(value: number): number;
export declare function distBetweenPointAndRectangle(pointX: number, pointY: number, rectPosX: number, rectPosY: number, rectWidth: number, rectHeight: number, rectRotation: number): number;
export declare function assertUnreachable(x: never): never;
export declare function getAngleDiff(sourceAngle: number, targetAngle: number): number;
export declare function getAbsAngleDiff(sourceAngle: number, targetAngle: number): number;
