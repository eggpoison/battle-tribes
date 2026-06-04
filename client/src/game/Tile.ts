import { Biome } from "../../../shared/src/biomes";
import { TileType } from "../../../shared/src/tiles";

export class Tile {
   public type: TileType;
   public biome: Biome;

   // @Memory: only used tor creating the initial river rendering data, not necessary after that!
   public bordersWater = false;

   public flowOffset = Math.random();

   public readonly mithrilRichness: number;

   constructor(tileType: TileType, biome: Biome, mithrilRichness: number) {
      this.type = tileType;
      this.biome = biome;

      this.mithrilRichness = mithrilRichness;
   }
}