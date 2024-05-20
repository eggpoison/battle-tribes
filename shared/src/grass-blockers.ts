import { Point } from "./utils";

interface BaseGrassBlocker {
   readonly position: Readonly<Point>;
   /** Amount of grass that the blocker blocks (from 0 -> 1) */
   blockAmount: number;
}

export interface GrassBlockerRectangle extends BaseGrassBlocker {
   readonly width: number;
   readonly height: number;
   readonly rotation: number;
}

export interface GrassBlockerCircle extends BaseGrassBlocker {
   readonly radius: number;
}

export type GrassBlocker = GrassBlockerRectangle | GrassBlockerCircle;

export function blockerIsCircluar(blocker: GrassBlocker): blocker is GrassBlockerCircle {
   return typeof (blocker as GrassBlockerCircle).radius !== "undefined";
}