import { Settings } from "battletribes-shared/settings";
import { SubtileType, TileType } from "battletribes-shared/tiles";
import { assert, clampToBoardDimensions, distance, getTileIndexIncludingEdges, getTileX, getTileY, lerp, Point, randFloat, randInt, smoothstep, TileIndex } from "battletribes-shared/utils";
import Layer from "../Layer";
import { generateOctavePerlinNoise, generatePerlinNoise } from "../perlin-noise";
import { groupLocalBiomes, setWallInSubtiles } from "./terrain-generation-utils";
import { Biome } from "../../../shared/src/biomes";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { createTreeRootBaseConfig } from "../entities/resources/tree-root-base";
import { getEntityType, createEntityImmediate } from "../world";
import { generateSpikyBastards } from "./spiky-bastard-generation";
import { getEntitiesInRange } from "../ai-shared";
import { EntityType } from "../../../shared/src/entities";
import { getLightLevelNode } from "../lights";
import { LightLevelVars } from "../../../shared/src/light-levels";
import { generateMithrilOre } from "./mithril-ore-generation";
import { createRawSpawnDistribution, registerNewSpawnInfo, SpawnDistribution } from "../entity-spawn-info";
import { EntityConfig } from "../components";
import { createBoulderConfig } from "../entities/resources/boulder";
import { createMossConfig } from "../entities/moss";
import { ServerComponentType } from "../../../shared/src/components";
import { createGlurbConfig } from "../entities/mobs/glurb";

const enum Vars {
   DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE = 9,
   TREE_ROOT_SPAWN_ATTEMPT_DENSITY = 0.5,
   MIN_MITHRIL_GENERATION_WEIGHT = 0.5
}

const NEIGHBOUR_TILE_OFFSETS: ReadonlyArray<[number, number]> = [
   [-1, 0],
   [1, 0],
   [0, -1],
   [0, 1]
];

const propagateAmbientLightFactor = (ambientLightFactors: Float32Array, nodeX: number, nodeY: number): void => {
   // @Hack
   const RANGE = 80;

   const minNodeX = Math.max(nodeX - RANGE, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeX = Math.min(nodeX + RANGE, (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   const minNodeY = Math.max(nodeY - RANGE, -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxNodeY = Math.min(nodeY + RANGE, (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   
   // @Speed: only run this propagate function on the edge nodes of dropdown zones, and fill in the inside node with 1's
   
   for (let currentNodeX = minNodeX; currentNodeX <= maxNodeX; currentNodeX++) {
      for (let currentNodeY = minNodeY; currentNodeY <= maxNodeY; currentNodeY++) {
         const dist = distance(nodeX, nodeY, currentNodeX, currentNodeY) * LightLevelVars.LIGHT_NODE_SIZE;
         
         const intensity = Math.exp(-dist / 64 / LightLevelVars.DROPDOWN_LIGHT_STRENGTH) * 1;
         
         const node = getLightLevelNode(currentNodeX, currentNodeY);
         const prevIntensity = ambientLightFactors[node];
         if (intensity > prevIntensity) {
            ambientLightFactors[node] = intensity;
         }
      }
   }
}

const spreadDropdownCloseness = (dropdownTileX: number, dropdownTileY: number, closenessArray: Float32Array): void => {
   const minTileX = Math.max(dropdownTileX - Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, -Settings.EDGE_GENERATION_DISTANCE);
   const maxTileX = Math.min(dropdownTileX + Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE - 1);
   const minTileY = Math.max(dropdownTileY - Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, -Settings.EDGE_GENERATION_DISTANCE);
   const maxTileY = Math.min(dropdownTileY + Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE - 1);
   
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         let distTiles = distance(tileX, tileY, dropdownTileX, dropdownTileY);
         if (distTiles > Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE) {
            distTiles = Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE;
         }

         let closeness = Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE - distTiles;
         closeness /= Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE;
         closeness = smoothstep(closeness);

         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (closeness > closenessArray[tileIndex]) {
            closenessArray[tileIndex] = closeness;
         }
      }
   }
}

const generateDepths = (dropdowns: ReadonlyArray<TileIndex>): ReadonlyArray<number> => {
   // To instill some randomness into the depths
   const weightMap = generateOctavePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, 35, 12, 1.75, 0.65);
   
   const depths = new Array<TileIndex>();
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         let distTiles = Number.MAX_SAFE_INTEGER;
         for (const dropdownTileIndex of dropdowns) {
            const dropdownTileX = getTileX(dropdownTileIndex);
            const dropdownTileY = getTileY(dropdownTileIndex);

            const dx = dropdownTileX - tileX;
            const dy = dropdownTileY - tileY;
            const dist = dx * dx + dy * dy;
            if (dist < distTiles) {
               distTiles = dist;
            }
         }
         assert(distTiles >= 0);
         distTiles = Math.sqrt(distTiles);

         let depth = distTiles / 100;
         
         // The further you travel from a dropdown, the more variation the weights have
         assert(distTiles + 1 > 0);
         const weightFactor = Math.log(distTiles + 1) * 0.07;
         const weight = weightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         depth += weight * weightFactor;
         
         if (depth > 1) {
            depth = 1;
         }

         depths.push(depth);
      }
   }

   return depths;
}

const WEIGHT_SPREAD_DISTANCE = 20;

const getMossHumidity = (layer: Layer, x: number, y: number): number => {
   const originTileX = Math.floor(x / Settings.TILE_SIZE);
   const originTileY = Math.floor(y / Settings.TILE_SIZE);

   const minTileX = clampToBoardDimensions(originTileX - WEIGHT_SPREAD_DISTANCE);
   const maxTileX = clampToBoardDimensions(originTileX + WEIGHT_SPREAD_DISTANCE);
   const minTileY = clampToBoardDimensions(originTileY - WEIGHT_SPREAD_DISTANCE);
   const maxTileY = clampToBoardDimensions(originTileY + WEIGHT_SPREAD_DISTANCE);

   let minDistToWaterTile = WEIGHT_SPREAD_DISTANCE;
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (layer.getTileType(tileIndex) === TileType.water) {
            const dist = distance(tileX, tileY, originTileX, originTileY);
            if (dist < minDistToWaterTile) {
               minDistToWaterTile = dist;
            }
         }
      }
   }

   let humidity = 1 - minDistToWaterTile / WEIGHT_SPREAD_DISTANCE;
   humidity *= humidity;
   return humidity;
}

const setWaterInMossHumidityMultipliers = (mossSpawnDistribution: Readonly<SpawnDistribution>, mossHumidityMultipliers: Float32Array, waterTileIndex: number): void => {
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.WORLD_SIZE_TILES / mossSpawnDistribution.blockSize;

   const originTileX = getTileX(waterTileIndex);
   const originTileY = getTileY(waterTileIndex);

   const minTileX = clampToBoardDimensions(originTileX - WEIGHT_SPREAD_DISTANCE);
   const maxTileX = clampToBoardDimensions(originTileX + WEIGHT_SPREAD_DISTANCE);
   const minTileY = clampToBoardDimensions(originTileY - WEIGHT_SPREAD_DISTANCE);
   const maxTileY = clampToBoardDimensions(originTileY + WEIGHT_SPREAD_DISTANCE);
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const dist = distance(tileX, tileY, originTileX, originTileY);
         if (dist > WEIGHT_SPREAD_DISTANCE) {
            continue;
         }

         let weight = (WEIGHT_SPREAD_DISTANCE - dist) / WEIGHT_SPREAD_DISTANCE;
         assert(weight >= 0 && weight <= 1);
         weight *= weight;
         weight *= weight;
         weight *= weight;
         weight *= weight;

         const blockX = Math.floor(tileX / mossSpawnDistribution.blockSize);
         const blockY = Math.floor(tileY / mossSpawnDistribution.blockSize);
         const blockIndex = blockY * BLOCKS_IN_BOARD_DIMENSIONS + blockX;

         mossHumidityMultipliers[blockIndex] += weight;
      }
   }
}

export function generateUndergroundTerrain(surfaceLayer: Layer, undergroundLayer: Layer): void {
   for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         if (surfaceLayer.getTileXYType(tileX, tileY) === TileType.dropdown) {
            for (let nodeX = tileX * 4; nodeX < (tileX + 1) * 4; nodeX++) {
               for (let nodeY = tileY * 4; nodeY < (tileY + 1) * 4; nodeY++) {
                  propagateAmbientLightFactor(undergroundLayer.ambientLightFactors, nodeX, nodeY);
               }
            }
         }
      }
   }

   const weightMap = generateOctavePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, 35, 12, 1.75, 0.65);

   const dropdownClosenessArray = new Float32Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);
   const dropdowns = new Array<TileIndex>();
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tileType = surfaceLayer.tileTypes[tileIndex];
         if (tileType === TileType.dropdown) {
            spreadDropdownCloseness(tileX, tileY, dropdownClosenessArray);
            dropdowns.push(tileIndex);
         }
      }
   }

   const mossSpawnDistribution = createRawSpawnDistribution(2, 0.12);
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.WORLD_SIZE_TILES / mossSpawnDistribution.blockSize;
   const mossHumidityMultipliers = new Float32Array(BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS);
   
   const depths = generateDepths(dropdowns);

   const waterGenerationNoise = generatePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, 8);
   const mithrilGenerationNoise = generatePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, 16);
   
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         let weight = weightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const dropdownCloseness = dropdownClosenessArray[tileIndex];

         weight *= 1 - dropdownCloseness;
         
         undergroundLayer.tileBiomes[tileIndex] = Biome.caves;

         const depth = depths[tileIndex];
         const mithrilGenerationWeight = mithrilGenerationNoise[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];

         let isMithrilRich = false;
         let richnessFactor = 0;
         let weightFactor = 0;
         
         if (weight > 0.57) {
            if (depth > 0.4 && weight < 0.65 && mithrilGenerationWeight > Vars.MIN_MITHRIL_GENERATION_WEIGHT) {
               isMithrilRich = true;
               richnessFactor = (mithrilGenerationWeight - Vars.MIN_MITHRIL_GENERATION_WEIGHT) / (1 - Vars.MIN_MITHRIL_GENERATION_WEIGHT)
               weightFactor = 1 - (weight - 0.57) / (0.65 - 0.57);
            }

            undergroundLayer.tileTypes[tileIndex] = TileType.stoneWallFloor;
            setWallInSubtiles(undergroundLayer.wallSubtileTypes, tileX, tileY, SubtileType.stoneWall);
         } else {
            if (depth > 0.4 && weight > 0.54 && mithrilGenerationWeight > Vars.MIN_MITHRIL_GENERATION_WEIGHT) {
               isMithrilRich = true;
               richnessFactor = (mithrilGenerationWeight - Vars.MIN_MITHRIL_GENERATION_WEIGHT) / (1 - Vars.MIN_MITHRIL_GENERATION_WEIGHT)
               weightFactor = (weight - 0.54) / (0.57 - 0.54);
            }

            let waterGenerationWeight = waterGenerationNoise[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
            // Only generate water at low depths
            waterGenerationWeight *= lerp(0.5, 1, 1 - depth);
            if (weight > 0.44 && weight < 0.51 && waterGenerationWeight > 0.65) {
               undergroundLayer.tileTypes[tileIndex] = TileType.water;
               setWaterInMossHumidityMultipliers(mossSpawnDistribution, mossHumidityMultipliers, tileIndex);
            } else {
               undergroundLayer.tileTypes[tileIndex] = TileType.stone;
            }
         }

         if (isMithrilRich) {
            // Calculate the mithril richness
            let richness = (1 - Math.pow(1 - richnessFactor, 2)) * (1 - Math.pow(1 - weightFactor, 2));
            richness = lerp(0.35, 1, richness);
            undergroundLayer.tileMithrilRichnesses[tileIndex] = richness;
         }
      }
   }

   // @Copynpaste
   for (let i = 0; i < mossHumidityMultipliers.length; i++) {
      mossSpawnDistribution.targetDensities[i] *= mossHumidityMultipliers[i];
   }
   
   groupLocalBiomes(undergroundLayer);

   const getMossColour = (x: number, y: number): number => {
      // Red moss spawns everywhere but fairly rarely
      if (Math.random() < 1/8) {
         return 3;
      }

      const tileX = Math.floor(x / Settings.TILE_SIZE);
      const tileY = Math.floor(y / Settings.TILE_SIZE);
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      const depth = depths[tileIndex];

      if (depth + randFloat(-0.06, 0.06) <= 0.15) {
         // Near dropdowns spawn golden moss
         return 5;
      } else if (depth + randFloat(-0.08, 0.08) <= 0.38) {
         // Close to the surface, spawn the green moss variants
         return Math.random() < 0.5 ? 0 : 1;
      } else {
         // Far away from the surface, spawn the darker moss variants
         return Math.random() < 0.5 ? 2 : 4;
      }
   }

   // Moses
   registerNewSpawnInfo({
      entityTypes: [EntityType.moss],
      layer: undergroundLayer,
      spawnRate: 0.05,
      biome: Biome.caves,
      tileTypes: [TileType.stone],
      packSpawning: {
         getPackSize: (pos: Point): number => {
            const humidity = getMossHumidity(undergroundLayer, pos.x, pos.y);
            const minPackSize = Math.floor(lerp(1, 3, humidity));
            const maxPackSize = Math.floor(lerp(2, 5, humidity));
            return randInt(minPackSize, maxPackSize);
         },
         spawnRange: 40
      },
      onlySpawnsInNight: false,
      minSpawnDistance: 30,
      spawnDistribution: mossSpawnDistribution,
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number, firstEntityConfigs: ReadonlyArray<EntityConfig> | null, layer: Layer): [EntityConfig] | null => {
         const humidity = getMossHumidity(layer, pos.x, pos.y);
         const minSize = lerp(0, 1, humidity);
         const maxSize = lerp(0, 3, humidity);
         let size = Math.floor(lerp(minSize, maxSize, Math.random()));
         if (size > 2) {
            size = 2;
         }
         
         const colour = firstEntityConfigs === null ? getMossColour(pos.x, pos.y): firstEntityConfigs[0].components[ServerComponentType.moss]!.colour;
         return [createMossConfig(pos, angle, size, colour)];
      }
   });

   generateSpikyBastards(undergroundLayer);

   generateMithrilOre(undergroundLayer, true);

   // Generate tree roots
   // @Cleanup: make entity spawning able to do this (will also make the tree roots show up in the spawn info!)
   const numAttempts = Math.floor(Settings.WORLD_SIZE_TILES * Settings.WORLD_SIZE_TILES * Vars.TREE_ROOT_SPAWN_ATTEMPT_DENSITY);
   for (let i = 0; i < numAttempts; i++) {
      const tileX = Math.floor(Math.random() * Settings.WORLD_SIZE_TILES);
      const tileY = Math.floor(Math.random() * Settings.WORLD_SIZE_TILES);

      // Only generate at low depths
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      const depth = depths[tileIndex];
      if (depth > Math.random() * 0.5 - 0.1) {
         continue;
      }

      // Make sure the tile is a wall tile
      if (!undergroundLayer.subtileIsWall(getSubtileIndex(tileX * 4, tileY * 4))) {
         continue;
      }

      const xyOffset = NEIGHBOUR_TILE_OFFSETS[Math.floor(Math.random() * 4)];

      const frontTileX = tileX + xyOffset[0];
      const frontTileY = tileY + xyOffset[1];

      // Make sure the front isn't a wall tile
      if (undergroundLayer.subtileIsWall(getSubtileIndex(frontTileX * 4, frontTileY * 4))) {
         continue;
      }

      let x: number;
      let y: number;
      if (xyOffset[0] !== 0) {
         x = (tileX + frontTileX + 1) * 0.5 * Settings.TILE_SIZE + 1 * xyOffset[0];
         y = (tileY + randFloat(0.2, 0.8)) * Settings.TILE_SIZE;
      } else {
         x = (tileX + randFloat(0.2, 0.8)) * Settings.TILE_SIZE;
         y = (tileY + frontTileY + 1) * 0.5 * Settings.TILE_SIZE + 1 * xyOffset[1];
      }

      // Don't spawn too close to spiky bastards or other tree roots
      const entities = getEntitiesInRange(undergroundLayer, x, y, 54);
      let isValid = true;
      for (const entity of entities) {
         const entityType = getEntityType(entity);
         if (entityType === EntityType.spikyBastard || entityType === EntityType.treeRootBase || entityType === EntityType.treeRootSegment) {
            isValid = false;
            break;
         }
      }
      if (!isValid) {
         continue;
      }
      
      const treeRoot = createTreeRootBaseConfig(new Point(x, y), 2 * Math.PI * Math.random());
      createEntityImmediate(treeRoot, undergroundLayer);
   }

   // @SQUEAM
   // registerNewSpawnInfo({
   //    entityTypes: [EntityType.boulder],
   //    layer: undergroundLayer,
   //    spawnRate: 0.005,
   //    biome: Biome.caves,
   //    tileTypes: [TileType.stone],
   //    onlySpawnsInNight: false,
   //    minSpawnDistance: 60,
   //    spawnDistribution: createRawSpawnDistribution(16, 0.025),
   //    balanceSpawnDistribution: true,
   //    doStrictTileTypeCheck: true,
   //    createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
   //       return [createBoulderConfig(pos, angle)];
   //    }
   // });
   // registerNewSpawnInfo({
   //    entityTypes: [EntityType.glurbHeadSegment, EntityType.glurbBodySegment, EntityType.glurbTailSegment],
   //    layer: undergroundLayer,
   //    spawnRate: 0.0025,
   //    biome: Biome.caves,
   //    tileTypes: [TileType.stone],
   //    onlySpawnsInNight: false,
   //    minSpawnDistance: 100,
   //    spawnDistribution: createRawSpawnDistribution(32, 0.004),
   //    balanceSpawnDistribution: true,
   //    doStrictTileTypeCheck: true,
   //    createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
   //       return createGlurbConfig(pos, angle);
   //    }
   // });
   // @HACK: Just so that mithril ore nodes get registered so tribesman know how to gather them
   registerNewSpawnInfo({
      entityTypes: [EntityType.mithrilOreNode],
      layer: undergroundLayer,
      spawnRate: 0.0025,
      biome: Biome.caves,
      tileTypes: [TileType.stone],
      onlySpawnsInNight: false,
      minSpawnDistance: 100,
      spawnDistribution: createRawSpawnDistribution(4, 0),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return null;
      }
   });
}