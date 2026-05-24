import { CollisionResult } from "../collision.js";
import { Point } from "../utils.js";
import { Box } from "./boxes.js";

export enum PivotPointType {
   // @Cleanup: normalised is the wrong kind of term I feel]
   /** Coordinates normalised to the hitboxes' size. (-0.5, -0.5) = bottom left, (0, 0) = middle, (0.5, 0.5) = top right */
   normalised,
   /** Coordinates taken as an offset from the hitboxes' position. */
   absolute
}

export interface PivotPoint {
   type: PivotPointType;
   readonly pos: Point;
}

export const _bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

export function createNormalisedPivotPoint(normalisedX: number, normalisedY: number): PivotPoint {
   return {
      type: PivotPointType.normalised,
      pos: new Point(normalisedX, normalisedY)
   };
}

export function createAbsolutePivotPoint(offsetX: number, offsetY: number): PivotPoint {
   return {
      type: PivotPointType.absolute,
      pos: new Point(offsetX, offsetY)
   };
}

export abstract class BaseBox {
   // @CLEANUP i should really make this only able to be manipulated through some supplied functions, so places can't mistakenly manipulate it thinking they're being correct
   public posX: number;
   public posY: number;

   /** Offset of the box from its parent. If on a root hitbox of a base entity, does nothing. */
   public offsetX: number;
   public offsetY: number;
   
   /** Point from which rotation is applied relative to. */
   public pivotX = 0;
   public pivotY = 0;
   public pivotType = PivotPointType.absolute;

   public relativeAngle: number;
   /** Angle the hitbox is facing, taken counterclockwise from the positive x axis (radians) */
   public angle: number;

   public scale = 1;
   public flipX = false;
   public totalFlipXMultiplier = 1;

   constructor(x: number, y: number, offsetX: number, offsetY: number, rotation: number) {
      this.posX = x;
      this.posY = y;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      
      this.relativeAngle = rotation;
      this.angle = rotation;
   }

   public abstract calculateBounds(): void;
   public abstract getCollisionResult(otherBox: Box, epsilon?: number): CollisionResult;
}