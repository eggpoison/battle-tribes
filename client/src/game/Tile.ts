import { TileType } from "battletribes-shared/tiles";
import { Biome } from "../../../shared/src/biomes";

export class Tile {
   public readonly x: number;
   public readonly y: number;

   public type: TileType;
   public biome: Biome;

   // @Memory: only used tor creating the initial river rendering data, not necessary after that!
   public bordersWater = false;

   public flowOffset = Math.random();

   public readonly mithrilRichness: number;

   constructor(x: number, y: number, tileType: TileType, biome: Biome, mithrilRichness: number) {
      this.x = x;
      this.y = y;

      this.type = tileType;
      this.biome = biome;

      this.mithrilRichness = mithrilRichness;
   }
}