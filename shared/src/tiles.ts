export const enum Biome {
   grasslands,
   desert,
   tundra,
   swamp,
   mountains,
   magmaFields,
   river
}

export const enum TileType {
   grass,
   dirt,
   water,
   sludge,
   slime,
   rock,
   darkRock,
   sand,
   sandstone,
   snow,
   ice,
   permafrost,
   magma,
   lava,
   fimbultur
}

export const TileTypeString: Record<TileType, string> = {
   [TileType.grass]: "grass",
   [TileType.dirt]: "dirt",
   [TileType.water]: "water",
   [TileType.sludge]: "sludge",
   [TileType.slime]: "slime",
   [TileType.rock]: "rock",
   [TileType.darkRock]: "dark rock",
   [TileType.sand]: "sand",
   [TileType.sandstone]: "sandstone",
   [TileType.snow]: "snow",
   [TileType.ice]: "ice",
   [TileType.permafrost]: "permafrost",
   [TileType.magma]: "magma",
   [TileType.lava]: "lava",
   [TileType.fimbultur]: "fimbultur"
};

export const NUM_TILE_TYPES = Object.keys(TileTypeString).length;

//                                                                 grass dirt  water sludge slime rock  darkRock sand  sandstone snow  ice  permafrost magma lava  frost 
export const TILE_FRICTIONS: ReadonlyArray<number>              = [0.65, 0.65, 1,    0.9,   1,    0.65, 0.65,    0.65, 0.65,     0.9,  0.2, 0.65,      0.65, 0.85, 0.65];
export const TILE_MOVE_SPEED_MULTIPLIERS: ReadonlyArray<number> = [1,    1,    0.6,  0.6,  0.3,  1,    1,       1,    1,        0.65, 1.5, 1,         1,    1,    1];

export interface TileInfo {
   type: TileType;
   biome: Biome;
   isWall: boolean;
}