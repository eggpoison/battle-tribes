import { TileType, Biome, SubtileType } from "battletribes-shared/tiles";

export interface TileGenerationRequirements {
   readonly noise?: {
      readonly scale: number;
      readonly minWeight?: number;
      readonly maxWeight?: number;
   }
   /** The minimum number of tiles from the end of the biome */
   readonly minDist?: number;
   /** The maximum number of tiles from the end of the biome */
   readonly maxDist?: number;
}

export interface FloorTileGenerationInfo {
   readonly tileType: TileType;
   /** Requirements for the tile generation info to be used */
   readonly requirements?: TileGenerationRequirements;
}

export interface WallTileGenerationInfo {
   readonly subtileType: SubtileType;
   /** Requirements for the tile generation info to be used */
   readonly requirements?: TileGenerationRequirements;
}

export type TileGenerationInfo = FloorTileGenerationInfo | WallTileGenerationInfo;

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
   readonly floorTiles: ReadonlyArray<FloorTileGenerationInfo>;
   readonly wallTiles: ReadonlyArray<WallTileGenerationInfo>;
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
      floorTiles: [
         {
            tileType: TileType.lava,
            requirements: {
               noise: {
                  scale: 7,
                  minWeight: 0.2
               },
               minDist: 3
            }
         },
         {
            tileType: TileType.magma
         }
      ],
      wallTiles: []
   },

   [Biome.river]: {
      spawnRequirements: null,
      floorTiles: [
         {
            tileType: TileType.water
         }
      ],
      wallTiles: []
   },

   [Biome.tundra]: {
      spawnRequirements: {
         maxTemperature: 0.4,
         maxHumidity: 0.8
      },
      floorTiles: [
         {
            tileType: TileType.ice,
            requirements: {
               noise: {
                  scale: 5,
                  minWeight: 0.8,
               },
               minDist: 8
            }
         },
         {
            tileType: TileType.fimbultur,
            requirements: {
               noise: {
                  scale: 8,
                  minWeight: 0.2
               },
               minDist: 20
            }
         },
         {
            tileType: TileType.permafrost,
            requirements: {
               noise: {
                  scale: 7,
                  minWeight: 0.2,
               },
               minDist: 12
            }
         },
         {
            tileType: TileType.permafrost,
            requirements: {
               noise: {
                  scale: 7,
                  minWeight: 0.65,
               },
               minDist: 8
            }
         },
         {
            tileType: TileType.ice,
            requirements: {
               noise: {
                  scale: 7,
                  minWeight: 0.65,
               },
               minDist: 1
            }
         },
         {
            tileType: TileType.snow
         }
      ],
      wallTiles: []
   },

   [Biome.desert]: {
      spawnRequirements: {
         minTemperature: 0.6,
         maxHumidity: 0.4
      },
      floorTiles: [
         {
            tileType: TileType.sand
         }
      ],
      wallTiles: [
         {
            subtileType: SubtileType.sandstoneWall,
            requirements: {
               noise: {
                  scale: 7,
                  minWeight: 0.7
               },
               minDist: 2
            }
         }
      ]
   },

   [Biome.mountains]: {
      spawnRequirements: {
         minHeight: 0.7
      },
      floorTiles: [
         {
            tileType: TileType.rock
         }
      ],
      wallTiles: [
         {
            subtileType: SubtileType.rockWall,
            requirements: {
               noise: {
                  scale: 7,
                  minWeight: 0.8,
               },
               minDist: 4
            }
         }
      ]
   },
   
   [Biome.swamp]: {
      spawnRequirements: {
         minTemperature: 0.55,
         minHumidity: 0.8
      },
      floorTiles: [
         {
            tileType: TileType.slime,
            requirements: {
               noise: {
                  scale: 2.5,
                  minWeight: 0.2
               },
               minDist: 4
            }
         },
         {
            tileType: TileType.slime,
            requirements: {
               noise: {
                  scale: 2.5,
                  minWeight: 0.6
               },
               minDist: 2
            }
         },
         {
            tileType: TileType.sludge
         }
      ],
      wallTiles: []
   },

   [Biome.grasslands]: {
      spawnRequirements: {},
      floorTiles: [
         {
            tileType: TileType.grass
         }
      ],
      wallTiles: []
   }
};

export default BIOME_GENERATION_INFO;