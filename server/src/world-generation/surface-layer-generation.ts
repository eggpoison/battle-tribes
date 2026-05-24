import { TileType, getTileIndexIncludingEdges, getTileX, getTileY, lerp, Point, randInt, smoothstep, Settings, TribeType, RectangularBox, ServerComponentType, Biome, EntityType, TreeSize, TileIndex, tileIsInWorldIncludingEdges } from "battletribes-shared";
import { generateOctavePerlinNoise, generatePerlinNoise, generatePointPerlinNoise } from "../perlin-noise.js";
import BIOME_GENERATION_INFO, { BiomeGenerationInfo, BiomeSpawnRequirements, TileGenerationInfo } from "./terrain-generation-info.js";
import { WaterTileGenerationInfo, generateRiverFeatures, generateRiverTiles } from "./river-generation.js";
import OPTIONS from "../options.js";
import Layer from "../Layer.js";
import { generateCaveEntrances } from "./cave-entrance-generation.js";
import { groupLocalBiomes, setWallInSubtiles } from "./terrain-generation-utils.js";
import { createRawSpawnDistribution, EntitySpawnEvent, registerNewSpawnInfo } from "../entity-spawn-info.js";
import { getEntitiesInRange } from "../ai-shared.js";
import { destroyEntity, getEntityType, getGameTicks } from "../world.js";
import { TransformComponentArray } from "../components/TransformComponent.js";
import { entityIsTribesman } from "../entities/tribes/tribe-member.js";
import { entityIsStructure } from "../structure-placement.js";
import { EntityConfig, getConfigComponent } from "../components.js";
import { createBerryBushConfig } from "../entities/resources/berry-bush.js";
import { createTreeConfig } from "../entities/resources/tree.js";
import { createBoulderConfig } from "../entities/resources/boulder.js";
import { createCactusConfig } from "../entities/desert/cactus.js";
import { createYetiConfig } from "../entities/mobs/yeti.js";
import { generateYetiTerritoryTiles, yetiTerritoryIsValid } from "../components/YetiComponent.js";
import { createIceSpikesConfig } from "../entities/resources/ice-spikes.js";
import { createSlimewispConfig } from "../entities/mobs/slimewisp.js";
import { createSlimeConfig } from "../entities/mobs/slime.js";
import { createFishConfig } from "../entities/mobs/fish.js";
import { createLilypadConfig } from "../entities/lilypad.js";
import { createTribeWorkerConfig } from "../entities/tribes/tribe-worker.js";
import Tribe from "../Tribe.js";
import { createDesertBushSandyConfig } from "../entities/desert/desert-bush-sandy.js";
import { createDesertBushLivelyConfig } from "../entities/desert/desert-bush-lively.js";
import { createDesertSmallWeedConfig } from "../entities/desert/desert-small-weed.js";
import { createDesertShrubConfig } from "../entities/desert/desert-shrub.js";
import { createTumbleweedLiveConfig } from "../entities/desert/tumbleweed-live.js";
import { createTumbleweedDeadConfig } from "../entities/desert/tumbleweed-dead.js";
import { createPalmTreeConfig } from "../entities/desert/palm-tree.js";
import { createSandstoneRockConfig } from "../entities/desert/sandstone-rock.js";
import { createSpruceTreeConfig } from "../entities/tundra/spruce-tree.js";
import { createTundraRockConfig } from "../entities/tundra/tundra-rock.js";
import { createSnowberryBushConfig } from "../entities/tundra/snowberry-bush.js";
import { createSnobeConfig } from "../entities/tundra/snobe.js";
import { createTundraRockFrozenConfig } from "../entities/tundra/tundra-rock-frozen.js";
import { createInguSerpentConfig } from "../entities/tundra/ingu-serpent.js";
import { createTukmokConfig } from "../entities/tundra/tukmok.js";
import { createDustfleaConfig } from "../entities/desert/dustflea.js";
import { createKrumblidConfig } from "../entities/mobs/krumblid.js";
import { createOkrenConfig } from "../entities/desert/okren.js";
import { getEntityComponentTypes } from "../entity-component-types.js";
import { surfaceLayer } from "../layers.js";
import SRandom from "../SRandom.js";
import { getBoxesCollidingEntities } from "../collision-detection.js";

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
            
            const distanceSquared = Math.pow(x - entityHitbox.box.posX, 2) + Math.pow(y - entityHitbox.box.posY, 2);
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

const calculateMatchingBiome = (height: number, temperature: number, humidity: number): Biome => {
   for (const biomeGenerationInfo of BIOME_GENERATION_INFO) {
      if (matchesBiomeRequirements(biomeGenerationInfo.spawnRequirements, height, temperature, humidity)) {
         return biomeGenerationInfo.biome;
      }
   }
   
   throw new Error(`Couldn't find a valid biome! Height: ${height}, temperature: ${temperature}, humidity: ${humidity}`);
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

const getTileGenerationInfo = <T extends TileGenerationInfo>(tileBiomes: Uint8Array, biomeDists: Uint8Array, biome: Biome, tileGenerationArray: ReadonlyArray<T>, tileX: number, tileY: number, height: number, temperature: number, humidity: number): T | undefined => {
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   const dist = biomeDists[tileIndex];
   
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
const generateTileTypes = (tileBiomes: Uint8Array, biomeDists: Uint8Array, tileTypes: Uint8Array, subtileTypes: Uint8Array, heightMap: Array<number>, temperatureMap: Array<number>, humidityMap: Array<number>): void => {
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         const biome: Biome = tileBiomes[tileIndex];
         const biomeGenerationInfo = getBiomeGenerationInfo(biome);

         const height = heightMap[tileIndex];
         const temperature = temperatureMap[tileIndex];
         const humidity = humidityMap[tileIndex];

         const floorTileGenerationInfo = getTileGenerationInfo(tileBiomes, biomeDists, biome, biomeGenerationInfo.floorTiles, tileX, tileY, height, temperature, humidity);
         if (typeof floorTileGenerationInfo === "undefined") {
            throw new Error(`Couldn't find a valid floor tile generation info! Biome: ${biome}`);
         }

         tileTypes[tileIndex] = floorTileGenerationInfo.tileType;
         
         const wallTileGenerationInfo = getTileGenerationInfo(tileBiomes, biomeDists, biome, biomeGenerationInfo.wallTiles, tileX, tileY, height, temperature, humidity);
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

const spreadBiomeDists = (biomeDists: Uint8Array, biomes: Uint8Array, biomeBorderTiles: Array<TileIndex>): void => {
   // @Garbage
   const ADJACENT_OFFSETS_X = [0, 0, 1, -1];
   const ADJACENT_OFFSETS_Y = [1, -1, 0, 0];

   while (biomeBorderTiles.length > 0) {
      const tileIndex = biomeBorderTiles[0];

      const biome = biomes[tileIndex];
      const biomeDist = biomeDists[tileIndex];

      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);

      for (let i = 0; i < 4; i++) {
         const offsetX = ADJACENT_OFFSETS_X[i];
         const offsetY = ADJACENT_OFFSETS_Y[i];
         
         const adjacentTileX = tileX + offsetX;
         const adjacentTileY = tileY + offsetY;
         if (tileIsInWorldIncludingEdges(adjacentTileX, adjacentTileY)) {
            const adjacentTileIndex = getTileIndexIncludingEdges(adjacentTileX, adjacentTileY);
            
            const adjacentBiome = biomes[adjacentTileIndex];
            const adjacentBiomeDist = biomeDists[adjacentTileIndex];
            // Since biomeDist=1 will always be spread before biomeDist=2, etc, can elide the check for < adjacentBiomeDist
            if (adjacentBiome === biome && adjacentBiomeDist === 0) {
               // @Speed
               if (!biomeBorderTiles.includes(adjacentTileIndex)) {
                  biomeBorderTiles.push(adjacentTileIndex);
                  biomeDists[adjacentTileIndex] = biomeDist + 1;
               }
            }
         }
      }

      // @speed? chop em all at once?
      biomeBorderTiles.splice(0, 1);
   }
}

export function generateSurfaceTerrain(surfaceLayer: Layer): void {
   // @SQUEAM
   SRandom.seed(2845700342);
   
   for (let i = 0; i < surfaceLayer.ambientLightFactors.length; i++) {
      surfaceLayer.ambientLightFactors[i] = 1;
   }

   // Generate the noise
   const heightMap = generateOctavePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, HEIGHT_NOISE_SCALE, 3, 1.5, 0.75);
   const temperatureMap = generatePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, TEMPERATURE_NOISE_SCALE, 0);
   const humidityMap = generatePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, HUMIDITY_NOISE_SCALE, 0);

   const biomeDists = new Uint8Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);

   const biomeBorderTiles: Array<TileIndex> = [];

   // Fill temperature and humidity arrays, calculate biomes, and mark tiles with biomeDist=1.
   let previousBiome = 0;
   for (let tileIndex = 0; tileIndex < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES; tileIndex++) {
      const rawTemperature = temperatureMap[tileIndex];
      const rawHumidity = humidityMap[tileIndex];
      const height = heightMap[tileIndex];
      
      // @Huh??
      const temperature = smoothstep(rawTemperature)
      const humidity = smoothstep(rawHumidity);

      surfaceLayer.tileTemperatures[tileIndex] = temperature;
      surfaceLayer.tileHumidities[tileIndex] = humidity;

      const biome = calculateMatchingBiome(height, temperature, humidity);

      surfaceLayer.tileBiomes[tileIndex] = biome;

      // Left-right biome borders
      const tileX = getTileX(tileIndex);
      if (biome !== previousBiome && tileX > -Settings.EDGE_GENERATION_DISTANCE) {
         biomeBorderTiles.push(tileIndex);
         biomeBorderTiles.push(tileIndex - 1);
         biomeDists[tileIndex] = 1;
         biomeDists[tileIndex - 1] = 1;
      }

      previousBiome = biome;

      // Top-down biome borders
      const tileY = getTileY(tileIndex);
      if (tileY > -Settings.EDGE_GENERATION_DISTANCE) {
         const tileBelow = tileIndex - Settings.FULL_WORLD_SIZE_TILES;
         const biomeBelow = surfaceLayer.tileBiomes[tileBelow];
         if (biomeBelow !== biome) {
            biomeBorderTiles.push(tileIndex);
            biomeBorderTiles.push(tileBelow);
            biomeDists[tileIndex] = 1;
            biomeDists[tileBelow] = 1;
         }
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

   spreadBiomeDists(biomeDists, surfaceLayer.tileBiomes, biomeBorderTiles);

   // Generate tiles
   generateTileTypes(surfaceLayer.tileBiomes, biomeDists, surfaceLayer.tileTypes, surfaceLayer.wallSubtileTypes, heightMap, temperatureMap, humidityMap);

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
      generateCaveEntrances(surfaceLayer, biomeDists);
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
   //       const species = firstEntityConfig === null ? randInt(0, 1) : getConfigComponent(firstEntityConfig[0].components, getEntityComponentTypes(EntityType.cow), ServerComponentType.cow).species;
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createBerryBushConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createTreeConfig(x, y, angle, Math.random() > 1/3 ? TreeSize.large : TreeSize.small)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createBoulderConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         const tileX = Math.floor(x / Settings.TILE_SIZE);
         const tileY = Math.floor(y / Settings.TILE_SIZE);
         const territory = generateYetiTerritoryTiles(tileX, tileY);
         if (yetiTerritoryIsValid(territory)) {
            return [createYetiConfig(x, y, angle, territory)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSpruceTreeConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createIceSpikesConfig(x, y, angle, 0)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         // @Hack @Copynpaste
         const tileX = Math.floor(x / Settings.TILE_SIZE);
         const tileY = Math.floor(y / Settings.TILE_SIZE);
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const temperature = temperatureMap[tileIndex];
         if (temperature > 0.25) {
            return null;
         }
         
         return [createTundraRockConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         // @Hack @Copynpaste
         const tileX = Math.floor(x / Settings.TILE_SIZE);
         const tileY = Math.floor(y / Settings.TILE_SIZE);
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const temperature = temperatureMap[tileIndex];
         if (temperature > 0.25) {
            return null;
         }
         
         return [createTundraRockFrozenConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSnowberryBushConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSnobeConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createInguSerpentConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return createTukmokConfig(x, y, angle);
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSlimewispConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createSlimeConfig(x, y, angle, 0)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDustfleaConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createKrumblidConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createOkrenConfig(x, y, angle, 4)];
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
      createEntity: (x: number, y: number, angle: number, firstEntityConfigs: ReadonlyArray<EntityConfig> | null): ReadonlyArray<EntityConfig> | null => {
         const colour = firstEntityConfigs === null ? randInt(0, 3) : getConfigComponent(firstEntityConfigs[0].components, getEntityComponentTypes(EntityType.fish), ServerComponentType.fish).colour;
         return [createFishConfig(x, y, angle, colour)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createLilypadConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createCactusConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertBushLivelyConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertShrubConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertBushSandyConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertSmallWeedConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createTumbleweedLiveConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createTumbleweedDeadConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         const tileX = Math.floor(x / Settings.TILE_SIZE);
         const tileY = Math.floor(y / Settings.TILE_SIZE);
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const temperature = temperatureMap[tileIndex];
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
         
         return [createSandstoneRockConfig(x, y, angle, size)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createPalmTreeConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertBushLivelyConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertShrubConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number): ReadonlyArray<EntityConfig> | null => {
         return [createDesertSmallWeedConfig(x, y, angle)];
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
      createEntity: (x: number, y: number, angle: number, firstEntityConfigs: ReadonlyArray<EntityConfig> | null): ReadonlyArray<EntityConfig> | null => {
         const colour = firstEntityConfigs === null ? randInt(0, 3) : getConfigComponent(firstEntityConfigs[0].components, getEntityComponentTypes(EntityType.fish), ServerComponentType.fish)!.colour;
         return [createFishConfig(x, y, angle, colour)];
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
         createEntity: (x: number, y: number, angle: number, _firstEntityConfigs: ReadonlyArray<EntityConfig> | null, layer: Layer): ReadonlyArray<EntityConfig> | null => {
            return [createTribeWorkerConfig(x, y, angle, new Tribe(getTribeType(layer, x, y), true, new Point(x, y)))];
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
         createEntity: (x: number, y: number, angle: number, _firstEntityConfigs: ReadonlyArray<EntityConfig> | null, layer: Layer): ReadonlyArray<EntityConfig> | null => {
            return [createTribeWorkerConfig(x, y, angle, new Tribe(getTribeType(layer, x, y), true, new Point(x, y)))];
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
         createEntity: (x: number, y: number, angle: number, _firstEntityConfigs: ReadonlyArray<EntityConfig> | null, layer: Layer): ReadonlyArray<EntityConfig> | null => {
            return [createTribeWorkerConfig(x, y, angle, new Tribe(getTribeType(layer, x, y), true, new Point(x, y)))];
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
         createEntity: (x: number, y: number, angle: number, _firstEntityConfigs: ReadonlyArray<EntityConfig> | null, layer: Layer): ReadonlyArray<EntityConfig> | null => {
            return [createTribeWorkerConfig(x, y, angle, new Tribe(getTribeType(layer, x, y), true, new Point(x, y)))];
         }
      });
   }
}

// @SQUEAM
export function regenerateSurfaceTerrain(): void {
   return;
   SRandom.seed(2845700342);
   
   const builtinRandomFunc = Math.random;
   Math.random = () => SRandom.next();
   
   const thung = getGameTicks() / Settings.TICK_RATE * 1;
   
   // Generate the noise
   const heightMap = generateOctavePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, HEIGHT_NOISE_SCALE, 3, 1.5, 0.75, thung);
   const temperatureMap = generatePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, TEMPERATURE_NOISE_SCALE, thung);
   const humidityMap = generatePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, HUMIDITY_NOISE_SCALE, thung);

   const tileTypes = new Uint8Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);
   const tileBiomes = new Uint8Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);
   const riverFlowDirections = new Float32Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);
   const tileTemperatures = new Float32Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);
   const tileHumidities = new Float32Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);
   // const tileMithrilRichnesses = new Float32Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);
   const wallSubtileTypes = new Uint8Array(16 * Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);

   // Fill temperature and humidity arrays
   for (let tileIndex = 0; tileIndex < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES; tileIndex++) {
      const rawTemperature = temperatureMap[tileIndex];
      const rawHumidity = humidityMap[tileIndex];
      const height = heightMap[tileIndex];
      
      // @Huh??
      const temperature = smoothstep(rawTemperature)
      const humidity = smoothstep(rawHumidity);

      tileTemperatures[tileIndex] = temperature;
      tileHumidities[tileIndex] = humidity;
      tileBiomes[tileIndex] = calculateMatchingBiome(height, temperature, humidity);
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
   generateTileTypes(tileBiomes, tileTypes, wallSubtileTypes, heightMap, temperatureMap, humidityMap);

   // Create flow directions array and create ice rivers
   for (const tileInfo of riverTiles) {
      const tileIndex = getTileIndexIncludingEdges(tileInfo.tileX, tileInfo.tileY);
      
      // Make ice rivers
      if (tileBiomes[tileIndex] === Biome.tundra) {
         tileTypes[tileIndex] = TileType.ice;
      } else {
         tileBiomes[tileIndex] = Biome.river;
         tileTypes[tileIndex] = TileType.water;
      }
      
      riverFlowDirections[tileIndex] = tileInfo.flowDirectionIdx;
   }

   for (let tileIndex = 0; tileIndex < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES; tileIndex++) {
      const type = tileTypes[tileIndex];
      const biome = tileBiomes[tileIndex];

      const prevType = surfaceLayer.getTileType(tileIndex);
      const prevBiome = surfaceLayer.getTileBiome(tileIndex);
      
      if (type !== prevType || biome !== prevBiome) {
         surfaceLayer.tileTypes[tileIndex] = type;
         surfaceLayer.tileBiomes[tileIndex] = biome;
         surfaceLayer.registerNewTileUpdate(tileIndex);

         if (prevType === TileType.grass) {
            const tileX = getTileX(tileIndex);
            const tileY = getTileY(tileIndex);
            const box = new RectangularBox((tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE, 0, 0, 0, Settings.TILE_SIZE, Settings.TILE_SIZE);
            const es = getBoxesCollidingEntities(surfaceLayer, [box]);
            // console.log(es.length);
            for (const e of es) {
               if (getEntityType(e) === EntityType.grassStrand) {
                  destroyEntity(e);
               }
            }
         }
      }
   }

   Math.random = builtinRandomFunc;
}