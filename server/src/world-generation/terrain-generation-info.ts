import { TileType, Biome } from "battletribes-shared/tiles";

export interface TileGenerationInfo {
   readonly tileType: TileType;
   readonly isWall: boolean;
   readonly noiseRequirements?: {
      readonly scale: number;
      readonly minWeight?: number;
      readonly maxWeight?: number;
   }
   /** The minimum number of tiles from the end of the biome */
   readonly minDist?: number;
   /** The maximum number of tiles from the end of the biome */
   readonly maxDist?: number;
}

export interface BiomeSpawnRequirements {
   readonly minHeight?: number;
   readonly maxHeight?: number;
   readonly minTemperature?: number;
   readonly maxTemperature?: number;
   readonly minHumidity?: number;
   readonly maxHumidity?: number;
}

export interface BiomeGenerationInfo {
   readonly spawnRequirements: BiomeSpawnRequirements | null;
   readonly tiles: ReadonlyArray<TileGenerationInfo>;
}

export const BIOME_GENERATION_PRIORITY = [
   Biome.magmaFields,
   Biome.river,
   Biome.tundra,
   Biome.desert,
   Biome.mountains,
   Biome.swamp,
   Biome.grasslands
];

const BIOME_GENERATION_INFO: Record<Biome, BiomeGenerationInfo> = {
   [Biome.magmaFields]: {
      spawnRequirements: null,
      tiles: [
         {
            tileType: TileType.lava,
            isWall: false,
            noiseRequirements: {
               scale: 7,
               minWeight: 0.2
            },
            minDist: 3
         },
         {
            tileType: TileType.magma,
            isWall: false
         }
      ]
   },
   [Biome.river]: {
      spawnRequirements: null,
      tiles: [
         {
            tileType: TileType.water,
            isWall: false
         }
      ]
   },
   [Biome.tundra]: {
      spawnRequirements: {
         maxTemperature: 0.4,
         maxHumidity: 0.8
      },
      tiles: [
         {
            tileType: TileType.fimbultur,
            isWall: false,
            noiseRequirements: {
               scale: 8,
               minWeight: 0.2
            },
            minDist: 20
         },
         {
            tileType: TileType.ice,
            isWall: false,
            noiseRequirements: {
               scale: 5,
               minWeight: 0.8,
            },
            minDist: 8
         },
         {
            tileType: TileType.permafrost,
            isWall: false,
            noiseRequirements: {
               scale: 7,
               minWeight: 0.2,
            },
            minDist: 12
         },
         {
            tileType: TileType.permafrost,
            isWall: false,
            noiseRequirements: {
               scale: 7,
               minWeight: 0.65,
            },
            minDist: 8
         },
         {
            tileType: TileType.ice,
            isWall: false,
            noiseRequirements: {
               scale: 7,
               minWeight: 0.65,
            },
            minDist: 1
         },
         {
            tileType: TileType.snow,
            isWall: false
         }
      ]
   },
   [Biome.desert]: {
      spawnRequirements: {
         minTemperature: 0.6,
         maxHumidity: 0.4
      },
      tiles: [
         // {
         //    tileType: TileType.sandstone,
         //    isWall: true,
         //    noiseRequirements: {
         //       scale: 7,
         //       minWeight: 0.7
         //    },
         //    minDist: 2
         // },
         {
            tileType: TileType.sand,
            isWall: false
         }
      ]
   },
   [Biome.mountains]: {
      spawnRequirements: {
         minHeight: 0.7
      },
      tiles: [
         // @Temporary
         // {
         //    tileType: TileType.darkRock,
         //    isWall: true,
         //    noiseRequirements: {
         //       scale: 7,
         //       minWeight: 0.8,
         //    },
         //    minDist: 2
         // },
         {
            tileType: TileType.rock,
            isWall: false
         }
      ]
   },
   [Biome.swamp]: {
      spawnRequirements: {
         minTemperature: 0.55,
         minHumidity: 0.8
      },
      tiles: [
         {
            tileType: TileType.slime,
            isWall: false,
            noiseRequirements: {
               scale: 2.5,
               minWeight: 0.2
            },
            minDist: 4
         },
         {
            tileType: TileType.slime,
            isWall: false,
            noiseRequirements: {
               scale: 2.5,
               minWeight: 0.6
            },
            minDist: 2
         },
         {
            tileType: TileType.sludge,
            isWall: false
         }
      ]
   },
   [Biome.grasslands]: {
      spawnRequirements: {},
      tiles: [
         {
            tileType: TileType.grass,
            isWall: false
         }
      ]
   }
};

export default BIOME_GENERATION_INFO;