import { Biome, TileInfo } from "webgl-test-shared/dist/tiles";
import { TileType } from "webgl-test-shared/dist/tiles";

export class Tile implements TileInfo {
   public readonly x: number;
   public readonly y: number;

   public type: TileType;
   public biome: Biome;
   public isWall: boolean;

   public bordersWater = false;
   public bordersWall = false;

   public flowOffset = Math.random();

   constructor(x: number, y: number, tileType: TileType, biome: Biome, isWall: boolean) {
      this.x = x;
      this.y = y;

      this.type = tileType;
      this.biome = biome;
      this.isWall = isWall;
   }
}