import { TileType } from "battletribes-shared/tiles";
import { getTileIndexIncludingEdges, lerp, Point, randInt, smoothstep } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { generateOctavePerlinNoise, generatePerlinNoise, generatePointPerlinNoise } from "../perlin-noise";
import BIOME_GENERATION_INFO, { BiomeGenerationInfo, BiomeSpawnRequirements, TileGenerationInfo } from "./terrain-generation-info";
import { WaterTileGenerationInfo, generateRiverFeatures, generateRiverTiles } from "./river-generation";
import OPTIONS from "../options";
import Layer from "../Layer";
import { generateCaveEntrances } from "./cave-entrance-generation";
import { groupLocalBiomes, setWallInSubtiles } from "./terrain-generation-utils";
import { Biome } from "../../../shared/src/biomes";
import { createRawSpawnDistribution, EntitySpawnEvent, registerNewSpawnInfo } from "../entity-spawn-info";
import { EntityType, TreeSize } from "../../../shared/src/entities";
import { getEntitiesInRange } from "../ai-shared";
import { getEntityType } from "../world";
import { TransformComponentArray } from "../components/TransformComponent";
import { entityIsTribesman } from "../entities/tribes/tribe-member";
import { entityIsStructure } from "../structure-placement";
import { EntityConfig } from "../components";
import { ServerComponentType } from "../../../shared/src/components";
import { createBerryBushConfig } from "../entities/resources/berry-bush";
import { createTreeConfig } from "../entities/resources/tree";
import { createBoulderConfig } from "../entities/resources/boulder";
import { createCactusConfig } from "../entities/desert/cactus";
import { createYetiConfig } from "../entities/mobs/yeti";
import { generateYetiTerritoryTiles, yetiTerritoryIsValid } from "../components/YetiComponent";
import { createIceSpikesConfig } from "../entities/resources/ice-spikes";
import { createSlimewispConfig } from "../entities/mobs/slimewisp";
import { createSlimeConfig } from "../entities/mobs/slime";
import { createFishConfig } from "../entities/mobs/fish";
import { createLilypadConfig } from "../entities/lilypad";
import { createTribeWorkerConfig } from "../entities/tribes/tribe-worker";
import Tribe from "../Tribe";
import { TribeType } from "../../../shared/src/tribes";
import { createDesertBushSandyConfig } from "../entities/desert/desert-bush-sandy";
import { createDesertBushLivelyConfig } from "../entities/desert/desert-bush-lively";
import { createDesertSmallWeedConfig } from "../entities/desert/desert-small-weed";
import { createDesertShrubConfig } from "../entities/desert/desert-shrub";
import { createTumbleweedLiveConfig } from "../entities/desert/tumbleweed-live";
import { createTumbleweedDeadConfig } from "../entities/desert/tumbleweed-dead";
import { createPalmTreeConfig } from "../entities/desert/palm-tree";
import { createSandstoneRockConfig } from "../entities/desert/sandstone-rock";
import { createSpruceTreeConfig } from "../entities/tundra/spruce-tree";
import { createTundraRockConfig } from "../entities/tundra/tundra-rock";
import { createSnowberryBushConfig } from "../entities/tundra/snowberry-bush";
import { createSnobeConfig } from "../entities/tundra/snobe";
import { createTundraRockFrozenConfig } from "../entities/tundra/tundra-rock-frozen";
import { createInguSerpentConfig } from "../entities/tundra/ingu-serpent";
import { createTukmokConfig } from "../entities/tundra/tukmok";
import { createDustfleaConfig } from "../entities/desert/dustflea";
import { createKrumblidConfig } from "../entities/mobs/krumblid";
import { createOkrenConfig } from "../entities/desert/okren";
import { createCowConfig } from "../entities/mobs/cow";

const enum Vars {
   TRIBESMAN_SPAWN_EXCLUSION_RANGE = 1200
}

const HEIGHT_NOISE_SCALE = 50;
const TEMPERATURE_NOISE_SCALE = 100;
const HUMIDITY_NOISE_SCALE = 30;

export let riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>;

const tribesmanSpawnPositionIsValid = (layer: Layer, x: number, y: number): boolean => {
   if (!OPTIONS.spawnTribesmen) {
      return false;
   }
   
   // @Cleanup: copy and paste
   
   const minChunkX = Math.max(Math.min(Math.floor((x - Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((x + Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((y - Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((y + Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.WORLD_SIZE_CHUNKS - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const entityType = getEntityType(entity);
            if (!entityIsStructure(entityType) && !entityIsTribesman(entityType)) {
               continue;
            }

            // @HACK
            
            const transformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = transformComponent.hitboxes[0];
            
            const distanceSquared = Math.pow(x - entityHitbox.box.position.x, 2) + Math.pow(y - entityHitbox.box.position.y, 2);
            if (distanceSquared <= Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE * Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) {
               return false;
            }
         }
      }
   }

   return true;
}

const isTooCloseToReedOrLilypad = (layer: Layer, x: number, y: number): boolean => {
   // Don't overlap with reeds at all
   let entities = getEntitiesInRange(layer, x, y, 24);
   for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (getEntityType(entity) === EntityType.reed) {
         return true;
      }
   }

   // Only allow overlapping slightly with other lilypads
   // @HACK: lilypad radius is hardcoded
   entities = getEntitiesInRange(layer, x, y, 28 - 6);
   for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (getEntityType(entity) === EntityType.lilypad) {
         return true;
      }
   }

   return false;
}

const matchesBiomeRequirements = (generationInfo: BiomeSpawnRequirements, height: number, temperature: number, humidity: number): boolean => {
   // Height
   if (typeof generationInfo.minHeight !== "undefined" && height < generationInfo.minHeight) return false;
   if (typeof generationInfo.maxHeight !== "undefined" && height > generationInfo.maxHeight) return false;
   
   // Temperature
   if (typeof generationInfo.minTemperature !== "undefined" && temperature < generationInfo.minTemperature) return false;
   if (typeof generationInfo.maxTemperature !== "undefined" && temperature > generationInfo.maxTemperature) return false;
   
   // Humidity
   if (typeof generationInfo.minHumidity !== "undefined" && humidity < generationInfo.minHumidity) return false;
   if (typeof generationInfo.maxHumidity !== "undefined" && humidity > generationInfo.maxHumidity) return false;

   return true;
}

const getBiome = (height: number, temperature: number, humidity: number): Biome => {
   for (const biomeGenerationInfo of BIOME_GENERATION_INFO) {
      if (matchesBiomeRequirements(biomeGenerationInfo.spawnRequirements, height, temperature, humidity)) {
         return biomeGenerationInfo.biome;
      }
   }
   
   throw new Error(`Couldn't find a valid biome! Height: ${height}, temperature: ${temperature}, humidity: ${humidity}`);
}

export function getTileDist(tileBiomes: Float32Array, tileX: number, tileY: number, maxSearchDist: number): number {
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   const tileBiome = tileBiomes[tileIndex] as Biome;

   for (let dist = 1; dist <= maxSearchDist; dist++) {
      for (let i = 0; i <= dist; i++) {
         // Top right
         if (tileX + i >= -Settings.EDGE_GENERATION_DISTANCE && tileX + i < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) {
            const topRightBiome = tileBiomes[getTileIndexIncludingEdges(tileX + i, tileY - dist + i)];
            if (topRightBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Bottom right
         if (tileX + dist - i >= -Settings.EDGE_GENERATION_DISTANCE && tileX + dist - i < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE && tileY + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY + i < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) {
            const bottomRightBiome = tileBiomes[getTileIndexIncludingEdges(tileX + dist - i, tileY + i)];
            if (bottomRightBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Bottom left
         if (tileX - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileX - dist + i < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE && tileY + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY + i < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) {
            const bottomLeftBiome = tileBiomes[getTileIndexIncludingEdges(tileX - dist + i, tileY + i)];
            if (bottomLeftBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Top left
         if (tileX - i >= -Settings.EDGE_GENERATION_DISTANCE && tileX - i < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) {
            const topLeftBiome = tileBiomes[getTileIndexIncludingEdges(tileX - i, tileY - dist + i)];
            if (topLeftBiome !== tileBiome) {
               return dist - 1;
            }
         }
      }
   }

   return maxSearchDist;
}

const getBiomeGenerationInfo = (biome: Biome): BiomeGenerationInfo => {
   for (const biomeGenerationInfo of BIOME_GENERATION_INFO) {
      if (biomeGenerationInfo.biome === biome) {
         return biomeGenerationInfo;
      }
   }
   throw new Error();
}

const getMinPossibleTemperature = (biome: Biome, tileGenerationInfo: TileGenerationInfo): number => {
   let min = 0;

   const biomeGenerationInfo = getBiomeGenerationInfo(biome);
   if (typeof biomeGenerationInfo !== "undefined" && biomeGenerationInfo.spawnRequirements !== null) {
      const biomeMinTemperature = biomeGenerationInfo.spawnRequirements.minTemperature;
      if (typeof biomeMinTemperature !== "undefined" && biomeMinTemperature > min) {
         min = biomeMinTemperature;
      }
   }

   const tileRequirements = tileGenerationInfo.requirements;
   if (typeof tileRequirements !== "undefined") {
      const tileMinTemperature = tileRequirements.minTemperature;
      if (typeof tileMinTemperature !== "undefined" && tileMinTemperature > min) {
         min = tileMinTemperature;
      }
   }

   return min;
}

// @Copynpaste
const getMaxPossibleTemperature = (biome: Biome, tileGenerationInfo: TileGenerationInfo): number => {
   let max = 1;

   const biomeGenerationInfo = getBiomeGenerationInfo(biome);
   if (typeof biomeGenerationInfo !== "undefined" && biomeGenerationInfo.spawnRequirements !== null) {
      const biomeMaxTemperature = biomeGenerationInfo.spawnRequirements.maxTemperature;
      if (typeof biomeMaxTemperature !== "undefined" && biomeMaxTemperature < max) {
         max = biomeMaxTemperature;
      }
   }

   const tileRequirements = tileGenerationInfo.requirements;
   if (typeof tileRequirements !== "undefined") {
      const tileMaxTemperature = tileRequirements.maxTemperature;
      if (typeof tileMaxTemperature !== "undefined" && tileMaxTemperature < max) {
         max = tileMaxTemperature;
      }
   }

   return max;
}

const getTileGenerationInfo = <T extends TileGenerationInfo>(tileBiomes: Float32Array, biome: Biome, tileGenerationArray: ReadonlyArray<T>, tileX: number, tileY: number, height: number, temperature: number, humidity: number): T | undefined => {
   // @Speed: Pre-calculate this for each biome
   /** The maximum distance that the algorithm will search for */
   let maxSearchDist = 0;
   for (let i = 0; i < tileGenerationArray.length; i++) {
      const tileGenerationInfo = tileGenerationArray[i];
      const requirements = tileGenerationInfo.requirements;
      if (typeof requirements !== "undefined") {
         if (typeof requirements.minDist !== "undefined" && requirements.minDist > maxSearchDist) {
            maxSearchDist = requirements.minDist;
         }
         if (typeof requirements.maxDist !== "undefined" && requirements.maxDist >= maxSearchDist) {
            maxSearchDist = requirements.maxDist + 1;
         }
      }
   }
         
   // @Speed: There are many tiles which don't need this information
   const dist = getTileDist(tileBiomes, tileX, tileY, maxSearchDist);
   
   for (const tileGenerationInfo of tileGenerationArray) {
      const requirements = tileGenerationInfo.requirements;
      if (typeof requirements === "undefined") {
         return tileGenerationInfo;
      }
      
      // Check requirements
      if (typeof requirements.customNoise !== "undefined") {
         let noiseIsValid = true;
         for (const noise of requirements.customNoise) {
            // If greater than 1, then the tile generation info will be valid
            let currentWeight = 1;
            let minWeight = 1;
            let maxWeight = 1;

            // @Speed @Garbage
            currentWeight *= generatePointPerlinNoise(tileX, tileY, noise.scale, biome + "-" + noise.scale);
   
            if (typeof noise.minWeight !== "undefined") {
               minWeight *= noise.minWeight;
            }
            if (typeof noise.maxWeight !== "undefined") {
               maxWeight *= noise.maxWeight;
            }
            // if (typeof requirements.noise.minWeight !== "undefined" && weight < requirements.noise.minWeight) continue;
            // if (typeof requirements.noise.maxWeight !== "undefined" && weight > requirements.noise.maxWeight) continue;
   
            // @HACK
            // Narrow the window
            if (typeof requirements.minTemperature !== "undefined" || typeof requirements.maxTemperature !== "undefined") {
               // currentWeight *= temperature;
   
               if (typeof requirements.minTemperature !== "undefined" && temperature < requirements.minTemperature) {
                  noiseIsValid = false;
                  break;
               }
               if (typeof requirements.maxTemperature !== "undefined" && temperature > requirements.maxTemperature) {
                  noiseIsValid = false;
                  break;
               }
   
               const minPossibleTemperature = getMinPossibleTemperature(biome, tileGenerationInfo);
               const maxPossibleTemperature = getMaxPossibleTemperature(biome, tileGenerationInfo);
               let temperaturePlacement = (temperature - minPossibleTemperature) / (maxPossibleTemperature - minPossibleTemperature);
               temperaturePlacement = smoothstep(temperaturePlacement);
   
               // move the min weight to the max according to the placement
               minWeight = lerp(minWeight, maxWeight, temperaturePlacement);
            }
            // if (typeof requirements.minTemperature !== "undefined") {
            //    minWeight *= getMinPossibleTemperature(biome, tileGenerationInfo);
            // }
            // if (typeof requirements.maxTemperature !== "undefined") {
            //    maxWeight *= getMaxPossibleTemperature(biome, tileGenerationInfo);
            // }

            if (currentWeight < minWeight || currentWeight > maxWeight) {
               noiseIsValid = false;
               break;
            }
         }

         if (!noiseIsValid) {
            continue;
         }
      }

      if (typeof requirements.minDist !== "undefined" && dist < requirements.minDist) continue;
      if (typeof requirements.maxDist !== "undefined" && dist > requirements.maxDist) continue;

      if (typeof requirements.minHeight !== "undefined" && height < requirements.minHeight) continue;
      if (typeof requirements.maxHeight !== "undefined" && height > requirements.maxHeight) continue;

      // if (typeof requirements.minTemperature !== "undefined" && temperature < requirements.minTemperature) continue;
      // if (typeof requirements.maxTemperature !== "undefined" && temperature > requirements.maxTemperature) continue;

      if (typeof requirements.minHumidity !== "undefined" && humidity < requirements.minHumidity) continue;
      if (typeof requirements.maxHumidity !== "undefined" && humidity > requirements.maxHumidity) continue;
      
      return tileGenerationInfo;
   }
}

/** Generate the tile array's tile types based on their biomes */
const generateTileInfo = (tileBiomes: Float32Array, tileTypes: Float32Array, subtileTypes: Float32Array, heightMap: Array<Array<number>>, temperatureMap: Array<Array<number>>, humidityMap: Array<Array<number>>): void => {
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         const biome = tileBiomes[tileIndex] as Biome;
         const biomeGenerationInfo = getBiomeGenerationInfo(biome);

         const height = heightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         const temperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         const humidity = humidityMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];

         const floorTileGenerationInfo = getTileGenerationInfo(tileBiomes, biome, biomeGenerationInfo.floorTiles, tileX, tileY, height, temperature, humidity);
         if (typeof floorTileGenerationInfo === "undefined") {
            throw new Error(`Couldn't find a valid floor tile generation info! Biome: ${biome}`);
         }
         tileTypes[tileIndex] = floorTileGenerationInfo.tileType;
         
         const wallTileGenerationInfo = getTileGenerationInfo(tileBiomes, biome, biomeGenerationInfo.wallTiles, tileX, tileY, height, temperature, humidity);
         if (OPTIONS.generateWalls && typeof wallTileGenerationInfo !== "undefined") {
            setWallInSubtiles(subtileTypes, tileX, tileY, wallTileGenerationInfo.subtileType)
         }
      }
   }
}

const getTribeType = (layer: Layer, x: number, y: number): TribeType => {
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   const tileType = layer.getTileXYType(tileX, tileY);
   switch (tileType) {
      case TileType.grass: {
         if (Math.random() < 0.2) {
            return TribeType.goblins;
         }
         return TribeType.plainspeople;
      }
      case TileType.sand: {
         if (Math.random() < 0.2) {
            return TribeType.goblins;
         }
         return TribeType.barbarians;
      }
      case TileType.snow:
      case TileType.ice: {
         return TribeType.frostlings;
      }
      case TileType.rock: {
         return TribeType.goblins;
      }
      default: {
         return randInt(0, 3);
      }
   }
}

export function generateSurfaceTerrain(surfaceLayer: Layer): void {
   for (let i = 0; i < surfaceLayer.ambientLightFactors.length; i++) {
      surfaceLayer.ambientLightFactors[i] = 1;
   }

   // Generate the noise
   const heightMap = generateOctavePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, HEIGHT_NOISE_SCALE, 3, 1.5, 0.75);
   const temperatureMap = generatePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, TEMPERATURE_NOISE_SCALE);
   const humidityMap = generatePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, HUMIDITY_NOISE_SCALE);

   // Fill temperature and humidity arrays
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         const rawTemperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         surfaceLayer.tileTemperatures[tileIndex] = smoothstep(rawTemperature);
         
         const rawHumidity = humidityMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         surfaceLayer.tileHumidities[tileIndex] = smoothstep(rawHumidity);
      }
   }
   
   // Fill tile biomes
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const height = heightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         const temperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         const humidity = humidityMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];

         // @SQUEAM
         let biome = getBiome(height, temperature, humidity);
         if (biome === Biome.tundra || biome === Biome.desert) {
            biome = Biome.grasslands;
         }
         
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         surfaceLayer.tileBiomes[tileIndex] = biome;
      }
   }

   // Generate rivers
   let riverTiles: ReadonlyArray<WaterTileGenerationInfo>;
   if (OPTIONS.generateRivers) {
      const riverGenerationInfo = generateRiverTiles();
      riverTiles = riverGenerationInfo.waterTiles;
      riverMainTiles = riverGenerationInfo.riverMainTiles;
   } else {
      riverTiles = [];
      riverMainTiles = [];
   }

   // Generate tiles
   generateTileInfo(surfaceLayer.tileBiomes, surfaceLayer.tileTypes, surfaceLayer.wallSubtileTypes, heightMap, temperatureMap, humidityMap);

   // Create flow directions array and create ice rivers
   for (const tileInfo of riverTiles) {
      const tileIndex = getTileIndexIncludingEdges(tileInfo.tileX, tileInfo.tileY);
      
      // Make ice rivers
      if (surfaceLayer.tileBiomes[tileIndex] === Biome.tundra) {
         surfaceLayer.tileTypes[tileIndex] = TileType.ice;
      } else {
         surfaceLayer.tileBiomes[tileIndex] = Biome.river;
         surfaceLayer.tileTypes[tileIndex] = TileType.water;
      }
      
      surfaceLayer.riverFlowDirections[tileIndex] = tileInfo.flowDirectionIdx;
   }

   generateRiverFeatures(surfaceLayer, riverTiles, surfaceLayer.waterRocks);

   groupLocalBiomes(surfaceLayer);

   if (OPTIONS.generateCaves) {
      generateCaveEntrances(surfaceLayer);
   }

   // @SQUEAM for clementus shot
   // registerNewSpawnInfo({
   //    entityTypes: [EntityType.cow],
   //    layer: surfaceLayer,
   //    spawnRate: 0.01,
   //    biome: Biome.grasslands,
   //    tileTypes: [TileType.grass],
   //    packSpawning: {
   //       getPackSize: () => randInt(2, 5),
   //       spawnRange: 200
   //    },
   //    onlySpawnsInNight: false,
   //    minSpawnDistance: 150,
   //    spawnDistribution: createRawSpawnDistribution(16, 0.003),
   //    balanceSpawnDistribution: false,
   //    doStrictTileTypeCheck: false,
   //    createEntity: (pos: Point, angle: number, firstEntityConfig: ReadonlyArray<EntityConfig> | null): ReadonlyArray<EntityConfig> | null => {
   //       const species = firstEntityConfig === null ? randInt(0, 1) : firstEntityConfig[0].components[ServerComponentType.cow]!.species;
   //       return [createCowConfig(pos, angle, species)];
   //    }
   // });
   registerNewSpawnInfo({
      entityTypes: [EntityType.berryBush],
      layer: surfaceLayer,
      spawnRate: 0.001,
      biome: Biome.grasslands,
      tileTypes: [TileType.grass],
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      spawnDistribution: createRawSpawnDistribution(8, 0.0025),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createBerryBushConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.tree],
      layer: surfaceLayer,
      spawnRate: 0.013,
      biome: Biome.grasslands,
      tileTypes: [TileType.grass],
      onlySpawnsInNight: false,
      minSpawnDistance: 75,
      spawnDistribution: createRawSpawnDistribution(8, 0.02),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createTreeConfig(pos, angle, Math.random() > 1/3 ? TreeSize.large : TreeSize.small)];
      }
   });
   // @TEMPORARY cuz they're messing up my shot!!!!
   // registerNewSpawnInfo({
   //    entityType: EntityType.tombstone,
   //    layer: surfaceLayer,
   //    spawnRate: 0.01,
   //    biome: Biome.grasslands,
   //    tileTypes: [TileType.grass],
   //    onlySpawnsInNight: true,
   //    minSpawnDistance: 150,
   //    spawnDistribution: createRawSpawnDistribution(4, 0.003),
   //    balanceSpawnDistribution: false,
   //    doStrictTileTypeCheck: true,
   //    createEntity: (x: number, y: number, angle: number): EntityConfig | null => {
   //       return createTombstoneConfig(new Point(x, y), angle);
   //    }
   // });
   registerNewSpawnInfo({
      entityTypes: [EntityType.boulder],
      layer: surfaceLayer,
      spawnRate: 0.005,
      biome: Biome.mountains,
      tileTypes: [TileType.rock],
      onlySpawnsInNight: false,
      minSpawnDistance: 60,
      spawnDistribution: createRawSpawnDistribution(8, 0.025),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createBoulderConfig(pos, angle)];
      }
   });
   // @Temporary
   // registerNewSpawnInfo({
   //    entityType: EntityType.cactus,
   //    layer: surfaceLayer,
   //    spawnRate: 0.005,
   //    biome: Biome.desert,
   //    tileTypes: [TileType.sand],
   //    onlySpawnsInNight: false,
   //    minSpawnDistance: 75,
   //    spawnDistribution: createRawSpawnDistribution(16, 0.01),
   //    balanceSpawnDistribution: true,
   //    doStrictTileTypeCheck: true,
   //    packSpawning: {
   //       getPackSize: () => randInt(1, 2),
   //       spawnRange: 80
   //    },
   //    createEntity: (x: number, y: number, angle: number): EntityConfig | null => {
   //       return createCactusConfig(new Point(x, y), angle);
   //    }
   // });
   registerNewSpawnInfo({
      entityTypes: [EntityType.yeti],
      layer: surfaceLayer,
      spawnRate: 0.0001,
      biome: Biome.tundra,
      tileTypes: [TileType.snow, TileType.ice, TileType.permafrost],
      onlySpawnsInNight: false,
      minSpawnDistance: 90,
      spawnDistribution: createRawSpawnDistribution(64, 0.00015),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         const tileX = Math.floor(pos.x / Settings.TILE_SIZE);
         const tileY = Math.floor(pos.y / Settings.TILE_SIZE);
         const territory = generateYetiTerritoryTiles(tileX, tileY);
         if (yetiTerritoryIsValid(territory)) {
            return [createYetiConfig(pos, angle, territory)];
         } else {
            return null;
         }
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.spruceTree],
      layer: surfaceLayer,
      spawnRate: 0.015,
      biome: Biome.tundra,
      tileTypes: [TileType.snow],
      onlySpawnsInNight: false,
      minSpawnDistance: 80,
      spawnDistribution: createRawSpawnDistribution(32, 0.04),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: false,
      packSpawning: {
         getPackSize: () => randInt(1, 4),
         spawnRange: 100
      },
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSpruceTreeConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.iceSpikes],
      layer: surfaceLayer,
      spawnRate: 0.015,
      biome: Biome.tundra,
      tileTypes: [TileType.ice, TileType.permafrost],
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      spawnDistribution: createRawSpawnDistribution(4, 0.06),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: false,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createIceSpikesConfig(pos, angle, 0)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.tundraRock],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.tundra,
      tileTypes: [TileType.snow],
      onlySpawnsInNight: false,
      minSpawnDistance: 30,
      spawnDistribution: createRawSpawnDistribution(32, 0.029),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: true,
      doStrictCollisionCheck: true,
      packSpawning: {
         getPackSize: () => randInt(3, 9),
         spawnRange: 80
      },
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         // @Hack @Copynpaste
         const tileX = Math.floor(pos.x / Settings.TILE_SIZE);
         const tileY = Math.floor(pos.y / Settings.TILE_SIZE);
         const temperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         if (temperature > 0.25) {
            return null;
         }
         
         return [createTundraRockConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.tundraRockFrozen],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.tundra,
      tileTypes: [TileType.permafrost],
      onlySpawnsInNight: false,
      minSpawnDistance: 30,
      spawnDistribution: createRawSpawnDistribution(32, 0.029),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      doStrictCollisionCheck: true,
      packSpawning: {
         getPackSize: () => randInt(3, 9),
         spawnRange: 80
      },
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         // @Hack @Copynpaste
         const tileX = Math.floor(pos.x / Settings.TILE_SIZE);
         const tileY = Math.floor(pos.y / Settings.TILE_SIZE);
         const temperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         if (temperature > 0.25) {
            return null;
         }
         
         return [createTundraRockFrozenConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.snowberryBush],
      layer: surfaceLayer,
      spawnRate: 0.001,
      biome: Biome.tundra,
      tileTypes: [TileType.snow],
      onlySpawnsInNight: false,
      minSpawnDistance: 30,
      spawnDistribution: createRawSpawnDistribution(32, 0.01),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      doStrictCollisionCheck: true,
      packSpawning: {
         getPackSize: () => randInt(1, 3),
         spawnRange: 80
      },
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSnowberryBushConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.snobe],
      layer: surfaceLayer,
      spawnRate: 0.01,
      biome: Biome.tundra,
      tileTypes: [TileType.snow, TileType.ice],
      onlySpawnsInNight: false,
      minSpawnDistance: 30,
      spawnDistribution: createRawSpawnDistribution(32, 0.008),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      doStrictCollisionCheck: true,
      packSpawning: {
         getPackSize: () => Math.random() < 0.5 ? 2 : 4,
         spawnRange: 120
      },
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSnobeConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.inguSerpent],
      layer: surfaceLayer,
      spawnRate: 0.01,
      biome: Biome.tundra,
      tileTypes: [TileType.permafrost],
      onlySpawnsInNight: false,
      minSpawnDistance: 30,
      spawnDistribution: createRawSpawnDistribution(32, 0.0055),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      doStrictCollisionCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createInguSerpentConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.tukmok],
      layer: surfaceLayer,
      spawnRate: 0.01,
      biome: Biome.tundra,
      tileTypes: [TileType.snow],
      onlySpawnsInNight: false,
      minSpawnDistance: 30,
      // @SQEAM
      spawnDistribution: createRawSpawnDistribution(32, 0.002),
      // spawnDistribution: createRawSpawnDistribution(32, 0),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      doStrictCollisionCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return createTukmokConfig(pos, angle);
      }
   });

   registerNewSpawnInfo({
      entityTypes: [EntityType.slimewisp],
      layer: surfaceLayer,
      spawnRate: 0.2,
      biome: Biome.swamp,
      tileTypes: [TileType.slime],
      onlySpawnsInNight: false,
      minSpawnDistance: 50,
      spawnDistribution: createRawSpawnDistribution(4, 0.3),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSlimewispConfig(pos, angle)];
      }
   });
   // @HACK @ROBUSTNESS: This is just here so that when tribesmen want to kill slimes, it registers where slimes can be found...
   // but this should instead be inferred from the fact that slimewisps merge together to make slimes!
   registerNewSpawnInfo({
      entityTypes: [EntityType.slime],
      layer: surfaceLayer,
      spawnRate: 0,
      biome: Biome.swamp,
      tileTypes: [TileType.slime],
      onlySpawnsInNight: false,
      minSpawnDistance: 50,
      spawnDistribution: createRawSpawnDistribution(4, 0),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSlimeConfig(pos, angle, 0)];
      }
   });

   registerNewSpawnInfo({
      entityTypes: [EntityType.dustflea],
      layer: surfaceLayer,
      spawnRate: 0,
      biome: Biome.desert,
      tileTypes: [TileType.sand],
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      spawnDistribution: createRawSpawnDistribution(4, 0.013),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDustfleaConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.krumblid],
      layer: surfaceLayer,
      spawnRate: 0,
      biome: Biome.desert,
      tileTypes: [TileType.sand],
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      spawnDistribution: createRawSpawnDistribution(4, 0.003),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createKrumblidConfig(pos, angle)];
      }
   });
   // @TEMPORARY cuz they are wandering out of the desert and messing stuff up
   registerNewSpawnInfo({
      entityTypes: [EntityType.okren],
      layer: surfaceLayer,
      spawnRate: 0,
      biome: Biome.desert,
      tileTypes: [TileType.sand],
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      spawnDistribution: createRawSpawnDistribution(4, 0.0007),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createOkrenConfig(pos, angle, 4)];
      }
   });
   
   registerNewSpawnInfo({
      entityTypes: [EntityType.fish],
      layer: surfaceLayer,
      spawnRate: 0.015,
      biome: Biome.river,
      tileTypes: [TileType.water],
      packSpawning: {
         getPackSize: () => randInt(3, 4),
         spawnRange: 200
      },
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      spawnDistribution: createRawSpawnDistribution(4, 0.03),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number, firstEntityConfigs: ReadonlyArray<EntityConfig> | null): ReadonlyArray<EntityConfig> | null => {
         const colour = firstEntityConfigs === null ? randInt(0, 3) : firstEntityConfigs[0].components[ServerComponentType.fish]!.colour;
         return [createFishConfig(pos, angle, colour)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.lilypad],
      layer: surfaceLayer,
      spawnRate: 0,
      biome: Biome.river,
      tileTypes: [TileType.water],
      packSpawning: {
         getPackSize: (): number => randInt(2, 3),
         spawnRange: 200
      },
      onlySpawnsInNight: false,
      minSpawnDistance: 0,
      spawnDistribution: createRawSpawnDistribution(4, 0.03),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      customSpawnIsValidFunc: (spawnInfo: EntitySpawnEvent, x: number, y: number): boolean => {
         // Make sure the lilypad isn't too close to a stepping stone
         const testEntities = getEntitiesInRange(spawnInfo.layer, x, y, 50);
         for (const entity of testEntities) {
            if (getEntityType(entity) === EntityType.riverSteppingStone) {
               return false;
            }
         }
         
         return !isTooCloseToReedOrLilypad(spawnInfo.layer, x, y);
      },
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createLilypadConfig(pos, angle)];
      }
   });
   // @TEMPORARY: crashes fo some reason...
   // registerNewSpawnInfo({
   //    entityType: EntityType.golem,
   //    layer: surfaceLayer,
   //    spawnRate: 0.002,
   //    biome: Biome.mountains,
   //    tileTypes: [TileType.rock],
   //    onlySpawnsInNight: false,
   //    minSpawnDistance: 150,
   //    spawnDistribution: createRawSpawnDistribution(4, 0.004),
   //    balanceSpawnDistribution: true,
   //    doStrictTileTypeCheck: true,
   //    createEntity: (x: number, y: number, angle: number): EntityConfig | null => {
   //       return createGolemConfig(new Point(x, y), angle);
   //    }
   // });
   registerNewSpawnInfo({
      entityTypes: [EntityType.cactus],
      layer: surfaceLayer,
      spawnRate: 0.005,
      biome: Biome.desert,
      tileTypes: [TileType.sandyDirt, TileType.sandyDirtDark],
      onlySpawnsInNight: false,
      minSpawnDistance: 35,
      spawnDistribution: createRawSpawnDistribution(8, 0.045),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createCactusConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.desertBushLively],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desert,
      tileTypes: [TileType.sandyDirt, TileType.sandyDirtDark],
      onlySpawnsInNight: false,
      minSpawnDistance: 40,
      spawnDistribution: createRawSpawnDistribution(8, 0.05),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertBushLivelyConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.desertShrub],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desert,
      tileTypes: [TileType.sandyDirt, TileType.sandyDirtDark],
      onlySpawnsInNight: false,
      minSpawnDistance: 40,
      spawnDistribution: createRawSpawnDistribution(8, 0.028),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertShrubConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.desertBushSandy],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desert,
      tileTypes: [TileType.sandyDirt, TileType.sandyDirtDark],
      onlySpawnsInNight: false,
      minSpawnDistance: 30,
      spawnDistribution: createRawSpawnDistribution(8, 0.13),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      packSpawning: {
         getPackSize: () => randInt(2, 3),
         spawnRange: 80
      },
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertBushSandyConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.desertSmallWeed],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desert,
      tileTypes: [TileType.sandyDirt, TileType.sandyDirtDark],
      onlySpawnsInNight: false,
      minSpawnDistance: 20,
      spawnDistribution: createRawSpawnDistribution(4, 0.12),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertSmallWeedConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.tumbleweedLive],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desert,
      tileTypes: [TileType.sand],
      onlySpawnsInNight: false,
      minSpawnDistance: 60,
      spawnDistribution: createRawSpawnDistribution(32, 0.002),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createTumbleweedLiveConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.tumbleweedDead],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desert,
      tileTypes: [TileType.sand],
      onlySpawnsInNight: false,
      minSpawnDistance: 60,
      spawnDistribution: createRawSpawnDistribution(32, 0.003),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createTumbleweedDeadConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.sandstoneRock],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desert,
      tileTypes: [TileType.sand],
      onlySpawnsInNight: false,
      minSpawnDistance: 30,
      spawnDistribution: createRawSpawnDistribution(16, 0.029),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      doStrictCollisionCheck: true,
      packSpawning: {
         getPackSize: () => randInt(3, 9),
         spawnRange: 80
      },
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         const tileX = Math.floor(pos.x / Settings.TILE_SIZE);
         const tileY = Math.floor(pos.y / Settings.TILE_SIZE);
         const temperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         if (temperature < 0.82) {
            return null;
         }
         
         let size: number;
         if (Math.random() < 0.4) {
            size = 0;
         } else if (Math.random() < 0.75) {
            size = 1;
         } else {
            size = 2;
         }
         
         return [createSandstoneRockConfig(pos, angle, size)];
      }
   });

   // 
   // Oasis
   // 
   registerNewSpawnInfo({
      entityTypes: [EntityType.palmTree],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desertOasis,
      tileTypes: [TileType.sandyDirt],
      onlySpawnsInNight: false,
      minSpawnDistance: 20,
      spawnDistribution: createRawSpawnDistribution(16, 0.05),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createPalmTreeConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.desertBushLively],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desertOasis,
      tileTypes: [TileType.sandyDirt],
      onlySpawnsInNight: false,
      minSpawnDistance: 40,
      spawnDistribution: createRawSpawnDistribution(8, 0.15),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertBushLivelyConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.desertShrub],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desertOasis,
      tileTypes: [TileType.sandyDirt],
      onlySpawnsInNight: false,
      minSpawnDistance: 40,
      spawnDistribution: createRawSpawnDistribution(8, 0.08),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertShrubConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.desertSmallWeed],
      layer: surfaceLayer,
      spawnRate: 0.002,
      biome: Biome.desertOasis,
      tileTypes: [TileType.sandyDirt],
      onlySpawnsInNight: false,
      minSpawnDistance: 20,
      spawnDistribution: createRawSpawnDistribution(4, 0.19),
      balanceSpawnDistribution: true,
      doStrictTileTypeCheck: false,
      createEntity: (pos: Point, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertSmallWeedConfig(pos, angle)];
      }
   });
   registerNewSpawnInfo({
      entityTypes: [EntityType.fish],
      layer: surfaceLayer,
      spawnRate: 0.015,
      biome: Biome.desertOasis,
      tileTypes: [TileType.water],
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      spawnDistribution: createRawSpawnDistribution(4, 0.06),
      balanceSpawnDistribution: false,
      doStrictTileTypeCheck: true,
      createEntity: (pos: Point, angle: number, firstEntityConfigs: ReadonlyArray<EntityConfig> | null): ReadonlyArray<EntityConfig> | null => {
         const colour = firstEntityConfigs === null ? randInt(0, 3) : firstEntityConfigs[0].components[ServerComponentType.fish]!.colour;
         return [createFishConfig(pos, angle, colour)];
      }
   });

   if (OPTIONS.spawnTribesmen) {
      // Grasslands
      registerNewSpawnInfo({
         entityTypes: [EntityType.tribeWorker],
         layer: surfaceLayer,
         spawnRate: 0.002,
         biome: Biome.grasslands,
         tileTypes: [TileType.grass],
         onlySpawnsInNight: false,
         minSpawnDistance: 100,
         spawnDistribution: createRawSpawnDistribution(4, 0.002),
         balanceSpawnDistribution: false,
         doStrictTileTypeCheck: true,
         customSpawnIsValidFunc(spawnInfo, spawnOriginX, spawnOriginY) {
            return tribesmanSpawnPositionIsValid(spawnInfo.layer, spawnOriginX, spawnOriginY);
         },
         createEntity: (pos: Point, angle: number, _firstEntityConfigs: ReadonlyArray<EntityConfig> | null, layer: Layer): ReadonlyArray<EntityConfig> | null => {
            return [createTribeWorkerConfig(pos, angle, new Tribe(getTribeType(layer, pos.x, pos.y), true, pos.copy()))];
         }
      });
      // Mountains
      registerNewSpawnInfo({
         entityTypes: [EntityType.tribeWorker],
         layer: surfaceLayer,
         spawnRate: 0.002,
         biome: Biome.mountains,
         tileTypes: [TileType.rock],
         onlySpawnsInNight: false,
         minSpawnDistance: 100,
         spawnDistribution: createRawSpawnDistribution(4, 0.002),
         balanceSpawnDistribution: false,
         doStrictTileTypeCheck: true,
         customSpawnIsValidFunc(spawnInfo, spawnOriginX, spawnOriginY) {
            return tribesmanSpawnPositionIsValid(spawnInfo.layer, spawnOriginX, spawnOriginY);
         },
         createEntity: (pos: Point, angle: number, _firstEntityConfigs: ReadonlyArray<EntityConfig> | null, layer: Layer): ReadonlyArray<EntityConfig> | null => {
            return [createTribeWorkerConfig(pos, angle, new Tribe(getTribeType(layer, pos.x, pos.y), true, pos.copy()))];
         }
      });
      // Desert
      registerNewSpawnInfo({
         entityTypes: [EntityType.tribeWorker],
         layer: surfaceLayer,
         spawnRate: 0.002,
         biome: Biome.desert,
         tileTypes: [TileType.sand],
         onlySpawnsInNight: false,
         minSpawnDistance: 100,
         spawnDistribution: createRawSpawnDistribution(4, 0.002),
         balanceSpawnDistribution: false,
         doStrictTileTypeCheck: true,
         customSpawnIsValidFunc(spawnInfo, spawnOriginX, spawnOriginY) {
            return tribesmanSpawnPositionIsValid(spawnInfo.layer, spawnOriginX, spawnOriginY);
         },
         createEntity: (pos: Point, angle: number, _firstEntityConfigs: ReadonlyArray<EntityConfig> | null, layer: Layer): ReadonlyArray<EntityConfig> | null => {
            return [createTribeWorkerConfig(pos, angle, new Tribe(getTribeType(layer, pos.x, pos.y), true, pos.copy()))];
         }
      });
      // Tundra
      registerNewSpawnInfo({
         entityTypes: [EntityType.tribeWorker],
         layer: surfaceLayer,
         spawnRate: 0.002,
         biome: Biome.tundra,
         tileTypes: [TileType.ice],
         onlySpawnsInNight: false,
         minSpawnDistance: 100,
         spawnDistribution: createRawSpawnDistribution(4, 0.002),
         balanceSpawnDistribution: false,
         doStrictTileTypeCheck: true,
         customSpawnIsValidFunc(spawnInfo, spawnOriginX, spawnOriginY) {
            return tribesmanSpawnPositionIsValid(spawnInfo.layer, spawnOriginX, spawnOriginY);
         },
         createEntity: (pos: Point, angle: number, _firstEntityConfigs: ReadonlyArray<EntityConfig> | null, layer: Layer): ReadonlyArray<EntityConfig> | null => {
            return [createTribeWorkerConfig(pos, angle, new Tribe(getTribeType(layer, pos.x, pos.y), true, pos.copy()))];
         }
      });
   }
}