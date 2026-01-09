import { TileType, SubtileType } from "battletribes-shared/tiles";
import { Biome } from "../../../shared/src/biomes";

export interface CustomTileNoiseInfo {
   readonly scale: number;
   readonly minWeight?: number;
   readonly maxWeight?: number;
}

export interface TileGenerationRequirements {
   readonly customNoise?: ReadonlyArray<CustomTileNoiseInfo>;
   /** The minimum number of tiles from the end of the biome */
   readonly minDist?: number;
   /** The maximum number of tiles from the end of the biome */
   readonly maxDist?: number;
   readonly minHeight?: number;
   readonly maxHeight?: number;
   readonly minTemperature?: number;
   readonly maxTemperature?: number;
   readonly minHumidity?: number;
   readonly maxHumidity?: number;
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
   readonly biome: Biome;
   readonly spawnRequirements: BiomeSpawnRequirements;
   readonly floorTiles: ReadonlyArray<FloorTileGenerationInfo>;
   readonly wallTiles: ReadonlyArray<WallTileGenerationInfo>;
}

const BIOME_GENERATION_INFO: ReadonlyArray<BiomeGenerationInfo> = [
   // {
   //    biome: Biome.magmaFields,
   //    spawnRequirements: null,
   //    floorTiles: [
   //       {
   //          tileType: TileType.lava,
   //          requirements: {
   //             customNoise: [
   //                {
   //                   scale: 7,
   //                   minWeight: 0.2
   //                }
   //             ],
   //             minDist: 3
   //          }
   //       },
   //       {
   //          tileType: TileType.magma
   //       }
   //    ],
   //    wallTiles: []
   // },
   // {
   //    biome: Biome.river,
   //    spawnRequirements: null,
   //    floorTiles: [
   //       {
   //          tileType: TileType.water
   //       }
   //    ],
   //    wallTiles: []
   // },
   // @SQUEAM! old tundra temp
   {
      biome: Biome.tundra,
      spawnRequirements: {
         maxTemperature: 0.4,
         maxHumidity: 0.4
      },
      floorTiles: [
         {
            tileType: TileType.fimbultur,
            requirements: {
               customNoise: [
                  {
                     scale: 8,
                     minWeight: 0.2
                  }
               ],
               minDist: 8
            }
         },
         {
            tileType: TileType.permafrost,
            requirements: {
               customNoise: [
                  {
                     scale: 7,
                     minWeight: 0.2,
                  }
               ],
               minDist: 4
            }
         },
         {
            tileType: TileType.ice,
            requirements: {
               customNoise: [
                  {
                     scale: 7,
                     minWeight: 0.65,
                  }
               ],
               minDist: 1
            },
         },
         {
            tileType: TileType.snow
         }
      ],
      wallTiles: []
   },
   // {
   //    biome: Biome.tundra,
   //    spawnRequirements: {
   //       maxTemperature: 0.3
   //    },
   //    floorTiles: [
   //       {
   //          tileType: TileType.permafrost,
   //          requirements: {
   //             customNoise: [
   //                {
   //                   scale: 28,
   //                   minWeight: 0.65,
   //                },
   //                {
   //                   scale: 7,
   //                   minWeight: 0.2,
   //                }
   //             ],
   //             minDist: 12
   //          }
   //       },
   //       {
   //          tileType: TileType.ice,
   //          requirements: {
   //             customNoise: [
   //                {
   //                   scale: 8,
   //                   minWeight: 0.65,
   //                },
   //                {
   //                   scale: 9,
   //                   minWeight: 0.65
   //                }
   //             ],
   //             minDist: 1
   //          }
   //       },
   //       {
   //          tileType: TileType.snow
   //       }
   //    ],
   //    wallTiles: [
   //       {
   //          subtileType: SubtileType.permafrostWall,
   //          requirements: {
   //             customNoise: [
   //                {
   //                   scale: 28,
   //                   minWeight: 0.75
   //                },
   //                {
   //                   scale: 7,
   //                   minWeight: 0.35,
   //                },
   //                {
   //                   scale: 5,
   //                   minWeight: 0.6
   //                }
   //             ],
   //             minDist: 12
   //          }
   //       }
   //    ]
   // },
   // @SQUEAM: temporarily removed oases
   // {
   //    biome: Biome.desertOasis,
   //    spawnRequirements: {
   //       minTemperature: 0.95,
   //    },
   //    floorTiles: [
   //       {
   //          tileType: TileType.water,
   //          requirements: {
   //             minDist: 3
   //          }
   //       },
   //       {
   //          tileType: TileType.sandyDirt
   //       }
   //    ],
   //    wallTiles: []
   // },
   // {
   //    biome: Biome.desert,
   //    spawnRequirements: {
   //       minTemperature: 0.7
   //    },
   //    floorTiles: [
   //       {
   //          tileType: TileType.sandyDirtDark,
   //          requirements: {
   //             customNoise: [
   //                {
   //                   scale: 6,
   //                   minWeight: 0.8
   //                }
   //             ],
   //             maxTemperature: 0.97
   //          }
   //       },
   //       {
   //          tileType: TileType.sandyDirt,
   //          requirements: {
   //             customNoise: [
   //                {
   //                   scale: 6,
   //                   minWeight: 0.45
   //                }
   //             ],
   //             maxTemperature: 0.95
   //          }
   //       },
   //       {
   //          tileType: TileType.sand
   //       }
   //    ],
   //    wallTiles: [
   //       {
   //          subtileType: SubtileType.sandstoneWall,
   //          requirements: {
   //             customNoise: [
   //                {
   //                   scale: 9,
   //                   minWeight: 0.41,
   //                   maxWeight: 0.59
   //                   // scale: 13,
   //                   // minWeight: 0.59,
   //                   // maxWeight: 0.68
   //                },
   //                {
   //                   scale: 17,
   //                   minWeight: 0.6
   //                }
   //             ],
   //             minDist: 10
   //          }
   //       }
   //    ]
   // },
   // @SQUEAM: Temporarily reverted to old terrain!
   {
      biome: Biome.desert,
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
               customNoise: [
                  {
                     scale: 7,
                     minWeight: 0.7
                  }
               ],
               minDist: 2
            }
         },
      ]
   },
   {
      biome: Biome.mountains,
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
               customNoise: [
                  {
                     scale: 7,
                     minWeight: 0.8,
                  }
               ],
               minDist: 4
            }
         }
      ]
   },
   {
      biome: Biome.swamp,
      spawnRequirements: {
         minTemperature: 0.55,
         minHumidity: 0.8
      },
      floorTiles: [
         {
            tileType: TileType.slime,
            requirements: {
               customNoise: [
                  {
                     scale: 2.5,
                     minWeight: 0.2
                  }
               ],
               minDist: 4
            }
         },
         {
            tileType: TileType.slime,
            requirements: {
               customNoise: [
                  {
                     scale: 2.5,
                     minWeight: 0.6
                  }
               ],
               minDist: 2
            }
         },
         {
            tileType: TileType.sludge
         }
      ],
      wallTiles: []
   },

   {
      biome: Biome.grasslands,
      spawnRequirements: {},
      floorTiles: [
         {
            tileType: TileType.grass
         }
      ],
      wallTiles: []
   }
];

export default BIOME_GENERATION_INFO;