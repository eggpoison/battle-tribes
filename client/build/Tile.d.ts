import { BiomeName, TileInfo } from "webgl-test-shared/dist/tiles";
import { TileType } from "webgl-test-shared/dist/tiles";
export declare class Tile implements TileInfo {
    readonly x: number;
    readonly y: number;
    type: TileType;
    biomeName: BiomeName;
    isWall: boolean;
    bordersWater: boolean;
    bordersWall: boolean;
    flowOffset: number;
    constructor(x: number, y: number, tileType: TileType, biomeName: BiomeName, isWall: boolean);
}
