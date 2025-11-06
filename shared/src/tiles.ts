export enum TileType {
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
   dropdown,
   stone,
   stoneWallFloor
}

export enum SubtileType {
   none,
   rockWall,
   sandstoneWall,
   stoneWall,
   permafrostWall,

   _LENGTH_
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
};