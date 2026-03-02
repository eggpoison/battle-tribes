import { CollisionResult } from "../collision";
import { Point } from "../utils";
import { Box } from "./boxes";

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
   public readonly position: Point;
   /** Offset of the box from its parent. If on a root hitbox of a base entity, does nothing. */
   public readonly offset: Point;
   /** Point from which rotation is applied relative to. */
   public pivot = createAbsolutePivotPoint(0, 0);

   public relativeAngle: number;
   /** Angle the hitbox is facing, taken counterclockwise from the positive x axis (radians) */
   public angle: number;

   public scale = 1;
   public flipX = false;
   public totalFlipXMultiplier = 1;

   constructor(position: Point, offset: Point, rotation: number) {
      this.position = position;
      this.offset = offset;
      
      this.relativeAngle = rotation;
      this.angle = rotation;
   }

   public abstract calculateBoundsMinX(): number;
   public abstract calculateBoundsMaxX(): number;
   public abstract calculateBoundsMinY(): number;
   public abstract calculateBoundsMaxY(): number;

   public abstract getCollisionResult(otherBox: Box, epsilon?: number): CollisionResult;
}