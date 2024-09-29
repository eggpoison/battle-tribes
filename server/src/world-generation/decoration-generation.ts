import { DecorationType, ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { randInt, randFloat, TileIndex } from "battletribes-shared/utils";
import Layer, { getTileIndexIncludingEdges, getTilesInRange, getTileX, getTileY, tileIsInWorldIncludingEdges } from "../Layer";
import { createDecorationConfig } from "../entities/decoration";
import { createEntityFromConfig } from "../Entity";
import { surfaceLayer } from "../world";

const enum Vars {
   RIVERSIDE_DECORATION_SPAWN_ATTEMPT_DENSITY_PER_TILE = 0.5,
   RIVERSIDE_DECORATION_MAX_RIVER_DIST = 50
}

interface DecorationGenerationInfo {
   readonly decorationTypes: ReadonlyArray<DecorationType>;
   readonly spawnableTileTypes: ReadonlyArray<TileType>;
   readonly spawnChancePerTile: number;
   readonly minGroupSize: number;
   readonly maxGroupSize: number;
   readonly isAffectedByTemperature: boolean;
   readonly hasUniformGroups: boolean;
}

const createDecoration = (x: number, y: number, decorationType: DecorationType): void => {
   const config = createDecorationConfig();
   config[ServerComponentType.transform].position.x = x;
   config[ServerComponentType.transform].position.y = y;
   config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config[ServerComponentType.decoration].decorationType = decorationType;
   createEntityFromConfig(config, surfaceLayer);
}

const generateRiversideDecorations = (): void => {
   // @Speed
   
   // @Incomplete: generate everywhere

   const numAttempts = Vars.RIVERSIDE_DECORATION_SPAWN_ATTEMPT_DENSITY_PER_TILE * Settings.BOARD_DIMENSIONS * Settings.BOARD_DIMENSIONS;
   
   for (let i = 0; i < numAttempts; i++) {
      const x = Settings.BOARD_UNITS * Math.random();
      const y = Settings.BOARD_UNITS * Math.random();

      const tileX = Math.floor(x / Settings.TILE_SIZE);
      const tileY = Math.floor(y / Settings.TILE_SIZE);
      const tileType = surfaceLayer.getTileType(tileX, tileY);
      if (tileType === TileType.water) {
         continue;
      }
      
      const tilesInRange = getTilesInRange(x, y, Vars.RIVERSIDE_DECORATION_MAX_RIVER_DIST);
      let isGood = false;
      for (const tileIndex of tilesInRange) {
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);
         if (surfaceLayer.getTileType(tileX, tileY) === TileType.water) {
            isGood = true;
            break;
         }
      }
      if (!isGood) {
         continue;
      }

      createDecoration(x, y, Math.random() < 0.5 ? DecorationType.rock : DecorationType.pebble);
   }
}

export function generateDecorations(): void {
   const GROUP_SPAWN_RANGE = 256;
   
   const DECORATION_GENERATION_INFO: ReadonlyArray<DecorationGenerationInfo> = [
      {
         decorationTypes: [DecorationType.pebble],
         spawnableTileTypes: [TileType.grass],
         spawnChancePerTile: 0.007,
         minGroupSize: 2,
         maxGroupSize: 4,
         isAffectedByTemperature: false,
         hasUniformGroups: false
      },
      {
         decorationTypes: [DecorationType.rock],
         spawnableTileTypes: [TileType.grass, TileType.rock],
         spawnChancePerTile: 0.003,
         minGroupSize: 1,
         maxGroupSize: 2,
         isAffectedByTemperature: false,
         hasUniformGroups: false
      },
      {
         decorationTypes: [DecorationType.sandstoneRock],
         spawnableTileTypes: [TileType.sand],
         spawnChancePerTile: 0.02,
         minGroupSize: 1,
         maxGroupSize: 3,
         isAffectedByTemperature: false,
         hasUniformGroups: false
      },
      {
         decorationTypes: [DecorationType.sandstoneRockBig1, DecorationType.sandstoneRockBig2],
         spawnableTileTypes: [TileType.sand],
         spawnChancePerTile: 0.01,
         minGroupSize: 1,
         maxGroupSize: 2,
         isAffectedByTemperature: false,
         hasUniformGroups: false
      },
      {
         decorationTypes: [DecorationType.blackRockSmall],
         spawnableTileTypes: [TileType.snow, TileType.permafrost],
         spawnChancePerTile: 0.02,
         minGroupSize: 1,
         maxGroupSize: 2,
         isAffectedByTemperature: false,
         hasUniformGroups: false
      },
      {
         decorationTypes: [DecorationType.blackRock],
         spawnableTileTypes: [TileType.snow, TileType.permafrost],
         spawnChancePerTile: 0.02,
         minGroupSize: 1,
         maxGroupSize: 1,
         isAffectedByTemperature: false,
         hasUniformGroups: false
      },
      {
         decorationTypes: [DecorationType.snowPile],
         spawnableTileTypes: [TileType.ice, TileType.permafrost],
         spawnChancePerTile: 0.02,
         minGroupSize: 1,
         maxGroupSize: 1,
         isAffectedByTemperature: false,
         hasUniformGroups: false
      },
      {
         decorationTypes: [DecorationType.flower1, DecorationType.flower2, DecorationType.flower3, DecorationType.flower4],
         spawnableTileTypes: [TileType.grass],
         spawnChancePerTile: 0.005,
         minGroupSize: 2,
         maxGroupSize: 6,
         isAffectedByTemperature: true,
         hasUniformGroups: true
      }
   ];

   const getDecorationGenerationInfo = (tileIndex: TileIndex): DecorationGenerationInfo | null => {
      const tileType = surfaceLayer.tileTypes[tileIndex];
      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);
      
      for (let i = 0; i < DECORATION_GENERATION_INFO.length; i++) {
         const generationInfo = DECORATION_GENERATION_INFO[i];
         if (!generationInfo.spawnableTileTypes.includes(tileType)) {
            continue;
         }

         if (generationInfo.isAffectedByTemperature) {
            // Flowers spawn less frequently the colder the tile is
            const idx = getTileIndexIncludingEdges(tileX, tileY);
            const temperature = surfaceLayer.tileTemperatures[idx];
            if (Math.random() > Math.pow(temperature, 0.3)) {
               continue;
            }
         }

         if (Math.random() < generationInfo.spawnChancePerTile) {
            return generationInfo;
         }
      }

      return null;
   }

   for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         const generationInfo = getDecorationGenerationInfo(tileIndex);
         if (generationInfo === null) {
            continue;
         }
            
         let decorationType = generationInfo.decorationTypes[randInt(0, generationInfo.decorationTypes.length - 1)];

         const x = (tileX + Math.random()) * Settings.TILE_SIZE;
         const y = (tileY + Math.random()) * Settings.TILE_SIZE;
         createDecoration(x, y, decorationType)

         const numOthers = randInt(generationInfo.minGroupSize, generationInfo.maxGroupSize) - 1;
         for (let i = 0; i < numOthers; i++) {
            const spawnOffsetMagnitude = randFloat(0, GROUP_SPAWN_RANGE);
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnX = x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnY = y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            const currentTileX = Math.floor(spawnX / Settings.TILE_SIZE);
            const currentTileY = Math.floor(spawnY / Settings.TILE_SIZE);
            if (!tileIsInWorldIncludingEdges(currentTileX, currentTileY)) {
               continue;
            }
            
            // Don't spawn in different tile types
            const currentTileIndex = getTileIndexIncludingEdges(currentTileX, currentTileY);
            const tileType = surfaceLayer.tileTypes[currentTileIndex];
            if (!generationInfo.spawnableTileTypes.includes(tileType)) {
               continue;
            }

            createDecoration(spawnX, spawnY, decorationType);

            if (!generationInfo.hasUniformGroups) {
               decorationType = generationInfo.decorationTypes[randInt(0, generationInfo.decorationTypes.length - 1)];
            }
         }
      }
   }

   generateRiversideDecorations();
}