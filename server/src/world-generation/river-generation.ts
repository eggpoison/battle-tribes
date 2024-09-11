import { WaterRockData, RiverSteppingStoneData, RiverSteppingStoneSize, RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { Point, TileCoordinates, lerp, randFloat } from "battletribes-shared/utils";
import { generateOctavePerlinNoise } from "../perlin-noise";
import Board from "../Board";
import SRandom from "../SRandom";

const NUM_RIVERS = 20;

const ADJACENT_TILE_OFFSETS: ReadonlyArray<[xOffset: number, yOffset: number]> = [
   [1, 0],
   [0, -1],
   [0, 1],
   [-1, 0]
];

const NEIGHBOUR_TILE_OFFSETS: ReadonlyArray<[xOffset: number, yOffset: number]> = [
   [1, 1],
   [1, 0],
   [1, -1],
   [0, -1],
   [0, 1],
   [-1, 1],
   [-1, 0],
   [-1, -1]
];

/** Amount of tiles of padding around the edge of the border */
const BORDER_PADDING = Settings.EDGE_GENERATION_DISTANCE + 5;

export interface WaterTileGenerationInfo {
   readonly tileX: number;
   readonly tileY: number;
   /** Index of the river flow direction */
   readonly flowDirectionIdx: number;
}

export interface RiverGenerationInfo {
   readonly waterTiles: ReadonlyArray<WaterTileGenerationInfo>;
   readonly riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>;
}

const getFlowDirectionIdx = (flowDirection: number): number => {
   // @Hack

   if (flowDirection >= 2 * Math.PI) {
      flowDirection -= 2 * Math.PI;
   } else if (flowDirection < 0) {
      flowDirection += 2 * Math.PI;
   }

   for (let i = 0; i < 8; i++) {
      const angle = i / 4 * Math.PI;
      if (Math.abs(angle - flowDirection) < 0.01) {
         return i;
      }
   }

   throw new Error();
}

export function generateRiverTiles(): RiverGenerationInfo {
   const rootTiles = new Array<WaterTileGenerationInfo>();

   for (let i = 0; i < NUM_RIVERS; i++) {
      const riverNoise = generateOctavePerlinNoise(Settings.BOARD_DIMENSIONS + BORDER_PADDING * 2, Settings.BOARD_DIMENSIONS + BORDER_PADDING * 2, 200, 5, 2, 0.5);

      let maxWeight = -1;
      let currentTileCoordinates: TileCoordinates | undefined;
      for (let x = 0; x < Settings.BOARD_DIMENSIONS; x++) {
         for (let y = 0; y < Settings.BOARD_DIMENSIONS; y++) {
            const weight = riverNoise[x + BORDER_PADDING][y + BORDER_PADDING];
            if (weight > maxWeight) {
               maxWeight = weight;
               currentTileCoordinates = {
                  x: x,
                  y: y
               };
            }
         }  
      }

      if (typeof currentTileCoordinates === "undefined") {
         throw new Error();
      }

      for (;;) {
         // Move to neighbour tile with lowest weight
         let minWeight = riverNoise[currentTileCoordinates.x + BORDER_PADDING][currentTileCoordinates.y + BORDER_PADDING];
         let minTileCoordinates: TileCoordinates | undefined;
         let secondMinTileCoordinates: TileCoordinates | undefined;
         for (const offset of NEIGHBOUR_TILE_OFFSETS) {
            const tileX = currentTileCoordinates.x + offset[0];
            const tileY = currentTileCoordinates.y + offset[1];
            if (tileX < -BORDER_PADDING || tileX >= Settings.BOARD_DIMENSIONS + BORDER_PADDING || tileY < -BORDER_PADDING || tileY >= Settings.BOARD_DIMENSIONS + BORDER_PADDING) {
               continue;
            }
            const weight = riverNoise[tileX + BORDER_PADDING][tileY + BORDER_PADDING];
            if (weight < minWeight) {
               minWeight = weight;
               secondMinTileCoordinates = minTileCoordinates;
               minTileCoordinates = {
                  x: tileX,
                  y: tileY
               };
            }
         }

         if (typeof minTileCoordinates === "undefined") {
            break;
         }

         let flowDirectionIdx: number;
         if (rootTiles.length > 0 && typeof secondMinTileCoordinates !== "undefined" && Math.random() < 0.3) {
            minTileCoordinates = secondMinTileCoordinates;
            flowDirectionIdx = rootTiles[rootTiles.length - 1].flowDirectionIdx;
         } else {
            const startPos = new Point(currentTileCoordinates.x, currentTileCoordinates.y);
            const endPos = new Point(minTileCoordinates.x, minTileCoordinates.y);
            flowDirectionIdx = getFlowDirectionIdx(startPos.calculateAngleBetween(endPos));
         }

         rootTiles.push({
            tileX: currentTileCoordinates.x,
            tileY: currentTileCoordinates.y,
            flowDirectionIdx: flowDirectionIdx
         });
         currentTileCoordinates = minTileCoordinates;
      }

      rootTiles.push({
         tileX: currentTileCoordinates.x,
         tileY: currentTileCoordinates.y,
         flowDirectionIdx: rootTiles[rootTiles.length - 2].flowDirectionIdx
      });
   }

   const tiles = new Array<WaterTileGenerationInfo>();
   
   for (const rootTile of rootTiles) {
      let minTileX = rootTile.tileX - 1;
      if (minTileX < -BORDER_PADDING) {
         minTileX = -BORDER_PADDING;
      }
      let maxTileX = rootTile.tileX + 1;
      if (maxTileX >= Settings.BOARD_DIMENSIONS + BORDER_PADDING) {
         maxTileX = Settings.BOARD_DIMENSIONS + BORDER_PADDING - 1;
      }
      let minTileY = rootTile.tileY - 1;
      if (minTileY < -BORDER_PADDING) {
         minTileY = -BORDER_PADDING;
      }
      let maxTileY = rootTile.tileY + 1;
      if (maxTileY >= Settings.BOARD_DIMENSIONS + BORDER_PADDING) {
         maxTileY = Settings.BOARD_DIMENSIONS + BORDER_PADDING - 1;
      }
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         outerLoop: for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            if (tileX < -Settings.EDGE_GENERATION_DISTANCE || tileX >= Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE || tileY < -Settings.EDGE_GENERATION_DISTANCE || tileY >= Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
               continue;
            }
            
            // Make sure the tile isn't already in the tiles array
            // @Speed
            for (const tile of tiles) {
               if (tile.tileX === tileX && tile.tileY === tileY) {
                  continue outerLoop;
               }
            }
            tiles.push({
               tileX: tileX,
               tileY: tileY,
               flowDirectionIdx: rootTile.flowDirectionIdx
            });
         }
      }
   }

   return {
      waterTiles: tiles,
      riverMainTiles: rootTiles
   };
}

const tileIsWater = (tileX: number, tileY: number, riverTiles: ReadonlyArray<WaterTileGenerationInfo>): boolean => {
   for (const tile of riverTiles) {
      if (tile.tileX === tileX && tile.tileY === tileY) {
         return true;
      }
   }
   return false;
}

const tileIsAdjacentToLand = (tileX: number, tileY: number, riverTiles: ReadonlyArray<WaterTileGenerationInfo>): boolean => {
   for (const offset of ADJACENT_TILE_OFFSETS) {
      const currentTileX = tileX + offset[0];
      const currentTileY = tileY + offset[1];
      if (Board.tileIsInBoard(currentTileX, currentTileY)) {
         if (!tileIsWater(currentTileX, currentTileY, riverTiles)) {
            return true;
         }
      }
   }

   return false;
}

const tileAtOffsetIsWater = (startTileX: number, startTileY: number, direction: number, riverTiles: ReadonlyArray<WaterTileGenerationInfo>): boolean => {
   const tileX = Math.floor(startTileX + 0.5 + Math.sin(direction));
   const tileY = Math.floor(startTileY + 0.5 + Math.cos(direction));
   return tileIsWater(tileX, tileY, riverTiles);
}

interface RiverCrossingInfo {
   readonly startTileX: number;
   readonly startTileY: number;
   readonly endTileX: number;
   readonly endTileY: number;
   readonly direction: number;
}

const calculateRiverCrossingPositions = (riverTiles: ReadonlyArray<WaterTileGenerationInfo>): ReadonlyArray<RiverCrossingInfo> => {
   const riverCrossings = new Array<RiverCrossingInfo>();
   
   for (const startTile of riverTiles) {
      if (!tileIsAdjacentToLand(startTile.tileX, startTile.tileY, riverTiles)) {
         continue;
      }

      const sign = SRandom.next() < 0.5 ? 1 : -1;
      const directionOffset = SRandom.randFloat(0, Math.PI/10) * sign;

      let crossingDirection: number | undefined;
      const clockwiseIsWater = tileAtOffsetIsWater(startTile.tileX, startTile.tileY, startTile.flowDirectionIdx + directionOffset + Math.PI/2, riverTiles);
      const anticlockwiseIsWater = tileAtOffsetIsWater(startTile.tileX, startTile.tileY, startTile.flowDirectionIdx + directionOffset - Math.PI/2, riverTiles);

      // Only generate a river if only one side of the river is water
      if ((!clockwiseIsWater && !anticlockwiseIsWater) || (clockwiseIsWater && anticlockwiseIsWater)) {
         continue;
      }
      if (clockwiseIsWater) {
         crossingDirection = startTile.flowDirectionIdx + directionOffset + Math.PI/2;
      } else {
         crossingDirection = startTile.flowDirectionIdx + directionOffset - Math.PI/2;
      }

      // Calculate distance of crossing
      let currentTileX = startTile.tileX + 0.5;
      let currentTileY = startTile.tileY + 0.5;
      let endTileIsValid = true;
      for (;;) {
         const newTileX = currentTileX + Math.sin(crossingDirection);
         const newTileY = currentTileY + Math.cos(crossingDirection);

         if (!Board.tileIsInBoard(newTileX - 0.5, newTileY - 0.5)) {
            endTileIsValid = false;
            break;
         }

         if (!tileIsWater(Math.floor(newTileX - 0.5), Math.floor(newTileY - 0.5), riverTiles)) {
            break;
         }

         currentTileX = newTileX;
         currentTileY = newTileY;
      }
      if (!endTileIsValid) {
         continue;
      }

      const crossingDistance = Math.sqrt(Math.pow(startTile.tileX + 0.5 - currentTileX, 2) + Math.pow(startTile.tileY + 0.5 - currentTileY, 2));
      
      // Don't try to make a crossing if the crossing would be too short or too long
      if (crossingDistance < 2.5 || crossingDistance > 5) {
         continue;
      }

      riverCrossings.push({
         startTileX: startTile.tileX,
         startTileY: startTile.tileY,
         endTileX: Math.floor(currentTileX - 0.5),
         endTileY: Math.floor(currentTileY - 0.5),
         direction: crossingDirection
      });
   }

   return riverCrossings;
}

export function generateRiverFeatures(riverTiles: ReadonlyArray<WaterTileGenerationInfo>, waterRocks: Array<WaterRockData>, riverSteppingStones: Array<RiverSteppingStoneData>): void {
   const MIN_CROSSING_DISTANCE = 325;
   /** Minimum distance between crossings */
   const RIVER_CROSSING_WIDTH = 100;
   const RIVER_CROSSING_WATER_ROCK_WIDTH = 150;
   const NUM_STONE_SPAWN_ATTEMPTS_PER_RIVER = 25;
   const RIVER_STEPPING_STONE_SPACING = -5;

   // Generate random water rocks throughout all river tiles
   for (const tile of riverTiles) {
      if (SRandom.next() < 0.075) {
         const x = (tile.tileX + SRandom.next()) * Settings.TILE_SIZE;
         const y = (tile.tileY + SRandom.next()) * Settings.TILE_SIZE;
         waterRocks.push({
            position: [x, y],
            rotation: 2 * Math.PI * SRandom.next(),
            size: SRandom.randInt(0, 1),
            opacity: SRandom.next()
         });
      }
   }
   
   // Calculate potential river crossing positions
   const potentialRiverCrossings = calculateRiverCrossingPositions(riverTiles);

   const riverCrossings = new Array<RiverCrossingInfo>();
   mainLoop:
   for (const crossingInfo of potentialRiverCrossings) {
      if (SRandom.next() >= 0.15) {
         continue;
      }
      
      // Make sure the crossing isn't too close to another crossing
      for (const otherCrossing of riverCrossings) {
         const dist = Math.sqrt(Math.pow(crossingInfo.startTileX - otherCrossing.startTileX, 2) + Math.pow(crossingInfo.startTileY - otherCrossing.startTileY, 2));
         if (dist < MIN_CROSSING_DISTANCE / Settings.TILE_SIZE) {
            continue mainLoop;
         }
      }

      riverCrossings.push(crossingInfo);
   }

   // Generate features for the crossings
   let currentCrossingGroupID = 0;
   for (const crossing of riverCrossings) {
      const minX = (crossing.startTileX + 0.5) * Settings.TILE_SIZE;
      const maxX = (crossing.endTileX + 0.5) * Settings.TILE_SIZE;
      const minY = (crossing.startTileY + 0.5) * Settings.TILE_SIZE;
      const maxY = (crossing.endTileY + 0.5) * Settings.TILE_SIZE;

      const localCrossingStones = new Array<RiverSteppingStoneData>();

      stoneCreationLoop:
      for (let i = 0; i < NUM_STONE_SPAWN_ATTEMPTS_PER_RIVER; i++) {
         const dist = i / (NUM_STONE_SPAWN_ATTEMPTS_PER_RIVER - 1);
         
         // Start the stone between the start and end of the crossing
         let x = lerp(minX, maxX, dist);
         let y = lerp(minY, maxY, dist);

         const offsetMultiplier = SRandom.randFloat(-1, 1);
         x += RIVER_CROSSING_WIDTH/2 * Math.sin(crossing.direction + Math.PI/2) * offsetMultiplier;
         y += RIVER_CROSSING_WIDTH/2 * Math.cos(crossing.direction + Math.PI/2) * offsetMultiplier;

         // Don't create stepping stones which would be outside the world
         if (x < -Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE || x >= Settings.BOARD_UNITS + Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE || y < -Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE || y >= Settings.BOARD_UNITS + Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE) {
            continue;
         }

         // Only spawn stepping stones on water
         const tileX = Math.floor(x / Settings.TILE_SIZE);
         const tileY = Math.floor(y / Settings.TILE_SIZE);
         if (!tileIsWater(tileX, tileY, riverTiles)) {
            continue;
         }

         const stoneSize: RiverSteppingStoneSize = SRandom.randInt(0, 2);
         const radius = RIVER_STEPPING_STONE_SIZES[stoneSize]/2;

         // Don't overlap with existing stones in the crossing
         for (const stone of localCrossingStones) {
            const dist = Math.sqrt(Math.pow(x - stone.positionX, 2) + Math.pow(y - stone.positionY, 2));
            if (dist - RIVER_STEPPING_STONE_SIZES[stone.size]/2 - radius < RIVER_STEPPING_STONE_SPACING) {
               continue stoneCreationLoop;
            }
         }

         const data: RiverSteppingStoneData = {
            positionX: x,
            positionY: y,
            size: stoneSize,
            rotation: 2 * Math.PI * SRandom.next(),
            groupID: currentCrossingGroupID
         };
         localCrossingStones.push(data);

         riverSteppingStones.push(data);
      }

      // Create water rocks
      const crossingDist = Math.sqrt(Math.pow(minX - maxX, 2) + Math.pow(minY - maxY, 2));
      const numWaterRocks = Math.floor(crossingDist / 6);
      for (let i = 0; i < numWaterRocks; i++) {
         const dist = SRandom.next();
         
         let x = lerp(minX, maxX, dist);
         let y = lerp(minY, maxY, dist);

         const offsetMultiplier = SRandom.randFloat(-1, 1);
         x += RIVER_CROSSING_WATER_ROCK_WIDTH/2 * Math.sin(crossing.direction + Math.PI/2) * offsetMultiplier;
         y += RIVER_CROSSING_WATER_ROCK_WIDTH/2 * Math.cos(crossing.direction + Math.PI/2) * offsetMultiplier;

         // Don't create water rocks outside the world
         if (x < -Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE || x >= Settings.BOARD_UNITS + Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE || y < -Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE || y >= Settings.BOARD_UNITS + Settings.EDGE_GENERATION_DISTANCE * Settings.TILE_SIZE) {
            continue;
         }

         // Only generate water rocks in water
         const tileX = Math.floor(x / Settings.TILE_SIZE);
         const tileY = Math.floor(y / Settings.TILE_SIZE);
         if (!tileIsWater(tileX, tileY, riverTiles)) {
            continue;
         }

         waterRocks.push({
            position: [x, y],
            size: SRandom.randInt(0, 1),
            rotation: 2 * Math.PI * SRandom.next(),
            opacity: randFloat(0.6, 1)
         });
      }

      currentCrossingGroupID++;
   }
}