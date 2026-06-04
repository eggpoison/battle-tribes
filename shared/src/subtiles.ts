import { Settings } from "./settings.js";
import { SubtileIndex } from "./utils.js";

export function getSubtileIndex(subtileX: number, subtileY: number): number {
   return (subtileY + Settings.EDGE_GENERATION_DISTANCE * 4) * Settings.FULL_WORLD_SIZE_TILES * 4 + subtileX + Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getSubtileX(subtileIndex: SubtileIndex): number {
   return subtileIndex % (Settings.FULL_WORLD_SIZE_TILES * 4) - Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getSubtileY(subtileIndex: SubtileIndex): number {
   return Math.floor(subtileIndex / (Settings.FULL_WORLD_SIZE_TILES * 4)) - Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function subtileIsInWorld(subtileX: number, subtileY: number): boolean {
   return subtileX >= 0 && subtileX < Settings.WORLD_SIZE_TILES * 4 && subtileY >= 0 && subtileY < Settings.WORLD_SIZE_TILES * 4;
}

export function subtileIsInWorldIncludingEdges(subtileX: number, subtileY: number): boolean {
   return subtileX >= -Settings.EDGE_GENERATION_DISTANCE * 4 && subtileX < (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 && subtileY >= -Settings.EDGE_GENERATION_DISTANCE * 4 && subtileY < (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4;
}