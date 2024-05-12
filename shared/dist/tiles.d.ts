export declare const enum Biome {
    grasslands = 0,
    desert = 1,
    tundra = 2,
    swamp = 3,
    mountains = 4,
    magmaFields = 5,
    river = 6
}
export declare const enum TileType {
    grass = 0,
    dirt = 1,
    water = 2,
    sludge = 3,
    slime = 4,
    rock = 5,
    darkRock = 6,
    sand = 7,
    sandstone = 8,
    snow = 9,
    ice = 10,
    permafrost = 11,
    magma = 12,
    lava = 13,
    fimbultur = 14
}
export declare const TileTypeString: Record<TileType, string>;
export declare const TILE_FRICTIONS: ReadonlyArray<number>;
export declare const TILE_MOVE_SPEED_MULTIPLIERS: ReadonlyArray<number>;
export interface TileInfo {
    type: TileType;
    biome: Biome;
    isWall: boolean;
}
