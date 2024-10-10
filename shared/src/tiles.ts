export const enum Biome {
   grasslands,
   desert,
   tundra,
   swamp,
   mountains,
   magmaFields,
   river
}

// @Hack @Robustness
export const NUM_BIOMES = Biome.river + 1;

export const enum TileType {
   grass,
   dirt,
   water,
   sludge,
   slime,
   rock,
   sand,
   snow,
   ice,
   permafrost,
   magma,
   lava,
   fimbultur,
   dropdown,
   stone,
   stoneWallFloor,

   _LENGTH_
}

export const enum SubtileType {
   none,
   rockWall,
   sandstoneWall,
   stoneWall,

   _LENGTH_
}

export const TileTypeString = {
   [TileType.grass]: "grass",
   [TileType.dirt]: "dirt",
   [TileType.water]: "water",
   [TileType.sludge]: "sludge",
   [TileType.slime]: "slime",
   [TileType.rock]: "rock",
   [TileType.sand]: "sand",
   [TileType.snow]: "snow",
   [TileType.ice]: "ice",
   [TileType.permafrost]: "permafrost",
   [TileType.magma]: "magma",
   [TileType.lava]: "lava",
   [TileType.fimbultur]: "fimbultur",
   [TileType.dropdown]: "dropdown",
   [TileType.stone]: "stone",
   [TileType.stoneWallFloor]: "Stone Wall Floor"
} as Record<TileType, string>;

export const NUM_TILE_TYPES = Object.keys(TileTypeString).length;

//                                                                 grass dirt  water sludge slime rock  darkRock sand  sandstone snow  ice  permafrost magma lava  frost dropdown stone stoneWallFloor
export const TILE_FRICTIONS: ReadonlyArray<number>              = [0.65, 0.65, 1,    0.9,   1,    0.65, 0.65,    0.65, 0.65,     0.9,  0.2, 0.65,      0.65, 0.85, 0.65, 0.65,    0.65, 0.65];
export const TILE_MOVE_SPEED_MULTIPLIERS: ReadonlyArray<number> = [1,    1,    0.6,  0.6,   0.3,  1,    1,       1,    1,        0.65, 1.5, 1,         1,    1,    1,    1,       1,    1];

export interface TileInfo {
   type: TileType;
   biome: Biome;
   isWall: boolean;
}