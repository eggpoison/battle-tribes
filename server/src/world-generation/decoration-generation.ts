import { DecorationInfo, DecorationType } from "webgl-test-shared/dist/client-server-types";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import { randInt, randFloat } from "webgl-test-shared/dist/utils";

interface DecorationGenerationInfo {
   readonly decorationType: DecorationType;
   readonly spawnableTileTypes: ReadonlyArray<TileType>;
   readonly spawnChancePerTile: number;
   readonly minGroupSize: number;
   readonly maxGroupSize: number;
   readonly numVariants: number;
}

export function generateDecorations(tileTypeArray: ReadonlyArray<ReadonlyArray<TileType>>, temperatureMap: ReadonlyArray<ReadonlyArray<number>>): ReadonlyArray<DecorationInfo> {
   const GROUP_SPAWN_RANGE = 256;
   
   const DECORATION_GENERATION_INFO: ReadonlyArray<DecorationGenerationInfo> = [
      {
         decorationType: DecorationType.pebble,
         spawnableTileTypes: [TileType.grass],
         spawnChancePerTile: 0.007,
         minGroupSize: 2,
         maxGroupSize: 4,
         numVariants: 1
      },
      {
         decorationType: DecorationType.rock,
         spawnableTileTypes: [TileType.grass, TileType.rock],
         spawnChancePerTile: 0.003,
         minGroupSize: 1,
         maxGroupSize: 2,
         numVariants: 1
      },
      {
         decorationType: DecorationType.sandstoneRock,
         spawnableTileTypes: [TileType.sand],
         spawnChancePerTile: 0.02,
         minGroupSize: 1,
         maxGroupSize: 3,
         numVariants: 1
      },
      {
         decorationType: DecorationType.sandstoneRockBig,
         spawnableTileTypes: [TileType.sand],
         spawnChancePerTile: 0.01,
         minGroupSize: 1,
         maxGroupSize: 2,
         numVariants: 2
      },
      {
         decorationType: DecorationType.blackRockSmall,
         spawnableTileTypes: [TileType.snow, TileType.permafrost],
         spawnChancePerTile: 0.02,
         minGroupSize: 1,
         maxGroupSize: 2,
         numVariants: 1
      },
      {
         decorationType: DecorationType.blackRock,
         spawnableTileTypes: [TileType.snow, TileType.permafrost],
         spawnChancePerTile: 0.02,
         minGroupSize: 1,
         maxGroupSize: 1,
         numVariants: 1
      },
      {
         decorationType: DecorationType.snowPile,
         spawnableTileTypes: [TileType.ice, TileType.permafrost],
         spawnChancePerTile: 0.02,
         minGroupSize: 1,
         maxGroupSize: 1,
         numVariants: 1
      },
      {
         decorationType: DecorationType.flower1,
         spawnableTileTypes: [TileType.grass],
         spawnChancePerTile: 0.0015,
         minGroupSize: 2,
         maxGroupSize: 6,
         numVariants: 1
      },
      {
         decorationType: DecorationType.flower2,
         spawnableTileTypes: [TileType.grass],
         spawnChancePerTile: 0.0015,
         minGroupSize: 2,
         maxGroupSize: 6,
         numVariants: 1
      },
      {
         decorationType: DecorationType.flower3,
         spawnableTileTypes: [TileType.grass],
         spawnChancePerTile: 0.0015,
         minGroupSize: 2,
         maxGroupSize: 6,
         numVariants: 1
      },
      {
         decorationType: DecorationType.flower4,
         spawnableTileTypes: [TileType.grass],
         spawnChancePerTile: 0.0015,
         minGroupSize: 2,
         maxGroupSize: 6,
         numVariants: 1
      }
   ];

   const getDecorationGenerationInfoIndex = (tileType: TileType, temperature: number): number => {
      for (let i = 0; i < DECORATION_GENERATION_INFO.length; i++) {
         const generationInfo = DECORATION_GENERATION_INFO[i];
         if (generationInfo.spawnableTileTypes.includes(tileType)) {
            // Flowers spawn less frequently the colder the tile is
            if (generationInfo.decorationType >= DecorationType.flower1 && generationInfo.decorationType <= DecorationType.flower2) {
               if (Math.random() > Math.pow(temperature, 0.3)) {
                  continue;
               }
            }
            
            if (Math.random() < generationInfo.spawnChancePerTile) {
               return i;
            }
         }
      }

      return 99999;
   }

   // @Speed: Triple-nested loop, and a whole bunch of continues (unnecessary iterations)!!
   const decorations = new Array<DecorationInfo>();
   for (let i = 0; i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2; i++) {
      for (let j = 0; j < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2; j++) {
         const tileType = tileTypeArray[i][j];
         const temperature = temperatureMap[i][j];
         const generationInfoIndex = getDecorationGenerationInfoIndex(tileType, temperature);
         if (generationInfoIndex !== 99999) {
            const generationInfo = DECORATION_GENERATION_INFO[generationInfoIndex];
            // Spawn a group of that decoration
            
            const x = (i - Settings.EDGE_GENERATION_DISTANCE + Math.random()) * Settings.TILE_SIZE;
            const y = (j - Settings.EDGE_GENERATION_DISTANCE + Math.random()) * Settings.TILE_SIZE;
            decorations.push({
               positionX: x,
               positionY: y,
               rotation: 2 * Math.PI * Math.random(),
               type: generationInfo.decorationType,
               variant: randInt(0, generationInfo.numVariants - 1)
            });

            const numOthers = randInt(generationInfo.minGroupSize, generationInfo.maxGroupSize) - 1;
            for (let k = 0; k < numOthers; k++) {
               const spawnOffsetMagnitude = randFloat(0, GROUP_SPAWN_RANGE);
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               const spawnX = x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               const spawnY = y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

               // Don't spawn outside the world
               if (spawnX < -Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE || spawnX >= Settings.BOARD_UNITS + Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE || spawnY < -Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE || spawnY >= Settings.BOARD_UNITS + Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE) {
                  continue;
               }

               // Don't spawn in different tile types
               const currentTileType = tileTypeArray[Math.floor(spawnX / Settings.TILE_SIZE) + Settings.EDGE_GENERATION_DISTANCE][Math.floor(spawnY / Settings.TILE_SIZE) + Settings.EDGE_GENERATION_DISTANCE];
               if (currentTileType !== tileType) {
                  continue;
               }
               
               decorations.push({
                  positionX: spawnX,
                  positionY: spawnY,
                  rotation: 2 * Math.PI * Math.random(),
                  type: generationInfo.decorationType,
                  variant: randInt(0, generationInfo.numVariants - 1)
               });
            }
         }
      }
   }

   return decorations;
}