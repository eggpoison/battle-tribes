import { Settings } from "./settings.js";

export type TileIndex = number;

export const enum TileType {
   // Index 0, because that probably maybe speeds up comparisons
   dropdown,
   grass,
   dirt,
   water,
   sludge,
   slime,
   rock,
   sand,
   sandyDirt,
   sandyDirtDark,
   snow,
   ice,
   permafrost,
   magma,
   lava,
   stone,
   stoneWallFloor,
   fimbultur
}

export const TileTypeString: Record<TileType, string> = {
   [TileType.grass]: "grass",
   [TileType.dirt]: "dirt",
   [TileType.water]: "water",
   [TileType.sludge]: "sludge",
   [TileType.slime]: "slime",
   [TileType.rock]: "rock",
   [TileType.sand]: "sand",
   [TileType.sandyDirt]: "sandyDirt",
   [TileType.sandyDirtDark]: "sandyDirtDark",
   [TileType.snow]: "snow",
   [TileType.ice]: "ice",
   [TileType.permafrost]: "permafrost",
   [TileType.magma]: "magma",
   [TileType.lava]: "lava",
   [TileType.dropdown]: "dropdown",
   [TileType.stone]: "stone",
   [TileType.stoneWallFloor]: "Stone Wall Floor",
   [TileType.fimbultur]: "Fimbultur",
};

export const NUM_TILE_TYPES = Object.keys(TileTypeString).length;

export interface TilePhysicsInfo {
   readonly friction: number;
   readonly moveSpeedMultiplier: number;
}

export const TILE_PHYSICS_INFO_RECORD: Record<TileType, TilePhysicsInfo> = {
   [TileType.grass]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.dirt]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.water]: {
      friction: 1,
      moveSpeedMultiplier: 0.6
   },
   [TileType.sludge]: {
      friction: 0.9,
      moveSpeedMultiplier: 0.6
   },
   [TileType.slime]: {
      friction: 1,
      moveSpeedMultiplier: 0.3
   },
   [TileType.rock]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.sand]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.sandyDirt]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.sandyDirtDark]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.snow]: {
      friction: 0.9,
      moveSpeedMultiplier: 0.65
   },
   [TileType.ice]: {
      friction: 0.2,
      moveSpeedMultiplier: 1.5
   },
   [TileType.permafrost]: {
      friction: 0.4,
      moveSpeedMultiplier: 1.2
   },
   [TileType.magma]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.lava]: {
      friction: 0.85,
      moveSpeedMultiplier: 1
   },
   [TileType.dropdown]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.stone]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.stoneWallFloor]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
   [TileType.fimbultur]: {
      friction: 0.65,
      moveSpeedMultiplier: 1
   },
};

export function getTileIndexIncludingEdges(tileX: number, tileY: number): TileIndex {
   if (tileX < -Settings.EDGE_GENERATION_DISTANCE || tileX >= Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE || tileY < -Settings.EDGE_GENERATION_DISTANCE || tileY >= Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) {
      throw new Error("Outside of world bounds!");
   }

   return (tileY + Settings.EDGE_GENERATION_DISTANCE) * Settings.FULL_WORLD_SIZE_TILES + tileX + Settings.EDGE_GENERATION_DISTANCE;
}

export function getTileX(tileIndex: TileIndex): number {
   return tileIndex % Settings.FULL_WORLD_SIZE_TILES - Settings.EDGE_GENERATION_DISTANCE;
}

export function getTileY(tileIndex: TileIndex): number {
   return Math.floor(tileIndex / Settings.FULL_WORLD_SIZE_TILES) - Settings.EDGE_GENERATION_DISTANCE;
}

export function tileIsInWorld(tileX: number, tileY: number): boolean {
   return tileX >= 0 && tileX < Settings.WORLD_SIZE_TILES && tileY >= 0 && tileY < Settings.WORLD_SIZE_TILES;
}

export function tileIsInWorldIncludingEdges(tileX: number, tileY: number): boolean {
   return tileX >= -Settings.EDGE_GENERATION_DISTANCE && tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE && tileY >= -Settings.EDGE_GENERATION_DISTANCE && tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE;
}