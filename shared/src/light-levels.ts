import { Settings } from "./settings";

export const enum LightLevelVar {
   LIGHT_NODE_SIZE = 16,
   /** Strength in tiles (@Cleanup: should this be in units instead?) */
   DROPDOWN_LIGHT_STRENGTH = 6
}

export type LightLevelNode = number;

export function getLightLevelNodeX(node: LightLevelNode): number {
   return node % (Settings.FULL_WORLD_SIZE_TILES * 4) - Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getLightLevelNodeY(node: LightLevelNode): number {
   return Math.floor(node / (Settings.FULL_WORLD_SIZE_TILES * 4)) - Settings.EDGE_GENERATION_DISTANCE * 4;
}