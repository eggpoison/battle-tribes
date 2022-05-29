import Board, { Coordinates } from "./Board";
import Tombstone from "./entities/Tombstone";
import ENTITY_INFO, { MobInfo, ResourceInfo } from "./entity-info";
import Game from "./Game";
import SETTINGS from "./settings";
import { BiomeName, TileType } from "./terrain-generation";
import { randInt, randItem } from "./utils";

const GRAVEYARD_SPAWN_CHANCES: Partial<Record<BiomeName, number>> = {
   Grasslands: 1
};

let mobInfoArray = new Array<MobInfo>();
let resourceInfoArray = new Array<ResourceInfo>();

const prefillEntityArrays = (): void => {
   for (const entityInfo of ENTITY_INFO) {
      if (entityInfo.hasOwnProperty("weight")) {
         resourceInfoArray.push(entityInfo as ResourceInfo);
      } else {
         mobInfoArray.push(entityInfo as MobInfo);
      }
   }
}

const getEligibleEntities = (tile: TileType, entityType: "mob" | "resource"): Array<MobInfo> | Array<ResourceInfo> | null => {
   let eligibleEntities!: Array<MobInfo> | Array<ResourceInfo>;
   if (entityType === "mob") {
      eligibleEntities = mobInfoArray.slice();
   } else {
      eligibleEntities = resourceInfoArray.slice();
   }

   for (let idx = eligibleEntities.length - 1; idx >= 0; idx--) {
      const entityInfo = eligibleEntities[idx];

      // Remove the entity if it is spawned some other way
      if (entityInfo.hasCustomSpawnProcess) {
         eligibleEntities.splice(idx, 1);
         continue;
      }

      // Remove the entity if there is the max number already
      if (entityType === "mob") {
         const behaviour = (entityInfo as MobInfo).behaviour;
         if ((behaviour === "hostile" || behaviour === "neutral") && !EntitySpawner.canSpawnHostileMobs()) {
            eligibleEntities.splice(idx, 1);
            continue;
         } else if (behaviour === "peaceful" && !EntitySpawner.canSpawnPassiveMobs()) {
            eligibleEntities.splice(idx, 1);
            continue;
         }
      }

      // Remove the entity if the tile is of the wrong type
      const preferredBiomes = entityInfo.spawnRequirements.biomes;
      if (typeof preferredBiomes !== "undefined" && !preferredBiomes.includes(tile.biome.name)) {
         eligibleEntities.splice(idx, 1);
         continue;
      }
   }

   if (eligibleEntities.length === 0) return null;
   return eligibleEntities;
}

abstract class EntitySpawner {
   /** The chance that mob spawning is done in a chunk each second */
   private static readonly MOB_SPAWN_RATE = 0.02;

   private static RESOURCE_SPAWN_CHANCE = 0.05 / SETTINGS.tps;

   /** The target number of hostile mobs in a chunk */
   private static readonly TARGET_HOSTILE_MOB_COUNT = 0.5;
   public static targetHostileMobCount: number;

   /** The target number of hostile mobs in a chunk */
   private static readonly TARGET_PASSIVE_MOB_COUNT = 0.25;
   public static targetPassiveMobCount: number;

   /** The target number of resources in a chunk */
   private static readonly TARGET_RESOURCE_COUNT = 2;
   private static targetResourceCount: number;

   /** How many tiles away from a spawn position a mob can spawn */
   private static readonly SPAWN_RADIUS = 2;

   private static hostileMobCount: number = 0;
   private static passiveMobCount: number = 0;
   private static resourceCount: number = 0;

   public static setup(): void {
      prefillEntityArrays();

      this.targetHostileMobCount = Math.floor(this.TARGET_HOSTILE_MOB_COUNT * Board.size * Board.size);
      this.targetPassiveMobCount = Math.floor(this.TARGET_PASSIVE_MOB_COUNT * Board.size * Board.size);

      this.targetResourceCount = Math.floor(this.TARGET_RESOURCE_COUNT * Board.size * Board.size);
   }

   public static spawnEntity(entityInfo: MobInfo | ResourceInfo, x: number, y: number): void {
      const position = Board.getRandomPositionInTile(x, y);

      const constr = entityInfo.getConstr();

      const entity = new constr(position);
      entity.setInfo(entityInfo);
      Board.addEntity(entity);
   }

   public static setHostileMobCount(hostileMobCount: number): void {
      this.hostileMobCount = hostileMobCount;
   }

   public static setPassiveMobCount(passiveMobCount: number): void {
      this.passiveMobCount = passiveMobCount;
   }

   public static setResourceCount(resourceCount: number): void {
      this.resourceCount = resourceCount;
   }

   private static spawnMobs(tileCoordinates: Coordinates, mobInfo: MobInfo): void {
      let spawnAmount!: number;
      if (typeof mobInfo.packSize === "number") {
         spawnAmount = mobInfo.packSize;
      } else {
         spawnAmount = randInt(...mobInfo.packSize);
      }

      for (let i = 0; i < spawnAmount; i++) {
         const x = tileCoordinates[0] + randInt(-this.SPAWN_RADIUS, this.SPAWN_RADIUS);
         const y = tileCoordinates[1] + randInt(-this.SPAWN_RADIUS, this.SPAWN_RADIUS);

         this.spawnEntity(mobInfo, x, y);
      }
   }

   private static spawnInitialMobs(): void {
      // Each chunk has a 2/10 chance to spawn a random mob
      const SPAWN_CHANCE = 0.2;

      // If the chunk is chosen, a random 5x5 square will be searched for available places to spawn mobs

      const SPAWN_RANGE = 2;

      for (let chunkY = 0; chunkY < Board.size; chunkY++) {
         for (let chunkX = 0; chunkX < Board.size; chunkX++) {
            if (Math.random() >= SPAWN_CHANCE) continue;

            const startTileX = chunkX * Board.chunkSize + randInt(0, Board.chunkSize - 1);
            const startTileY = chunkY * Board.chunkSize + randInt(0, Board.chunkSize - 1);

            yLoop: for (let y = Math.max(startTileY - SPAWN_RANGE, 0); y <= Math.min(startTileY + SPAWN_RANGE, Board.dimensions - 1); y++) {
               for (let x = Math.max(startTileX - SPAWN_RANGE, 0); x <= Math.min(startTileX + SPAWN_RANGE, Board.dimensions - 1); x++) {
                  const tile = Board.getTile(x, y);

                  const eligibleMobs = getEligibleEntities(tile, "mob") as Array<MobInfo>;

                  if (eligibleMobs !== null) {
                     const mobInfo = randItem(eligibleMobs);

                     this.spawnMobs([x, y], mobInfo);
                     break yLoop;
                  }
               }
            }
         }
      }
   }

   private static getRandomResource(resources: ReadonlyArray<ResourceInfo>): ResourceInfo {
      let totalWeight = 0;
      for (const resource of resources) {
         totalWeight += resource.weight;
      }
      
      const weight = randInt(0, totalWeight);
      
      let currentWeight = 0;
      for (const resource of resources) {
         const newWeight = currentWeight + resource.weight;
         
         if (weight >= currentWeight && weight <= newWeight) {
            return resource;
         }
         
         currentWeight = newWeight;
      }
      
      throw new Error("Couldn't get resource from resource list!");
   }

   private static spawnResourceInChunk(chunkX: number, chunkY: number): void {
      const x = randInt(chunkX * Board.chunkSize, (chunkX + 1) * Board.chunkSize - 1);
      const y = randInt(chunkY * Board.chunkSize, (chunkY + 1) * Board.chunkSize - 1);

      const tile = Board.getTile(x, y);

      const eligibleResources = getEligibleEntities(tile, "resource") as Array<ResourceInfo>;

      if (eligibleResources !== null) {
         const resource = this.getRandomResource(eligibleResources);
         
         this.spawnEntity(resource, x, y);
      }
   }

   public static canSpawnHostileMobs(): boolean {
      return this.hostileMobCount < this.targetHostileMobCount;
   }

   public static canSpawnPassiveMobs(): boolean {
      return this.passiveMobCount < this.targetPassiveMobCount;
   }

   public static canSpawnResources(): boolean {
      return this.resourceCount < this.targetResourceCount;
   }

   private static spawnTombstones(): void {
      if (!Game.isNight() || !this.canSpawnHostileMobs()) return;

      const SPAWN_CHANCE_MULTIPLIER = 0.4;

      const x = randInt(0, Board.dimensions - 1);
      const y = randInt(0, Board.dimensions - 1);

      const tileBiome = Board.getTile(x, y).biome;

      if (tileBiome.name in GRAVEYARD_SPAWN_CHANCES && Math.random() < GRAVEYARD_SPAWN_CHANCES[tileBiome.name]! * SPAWN_CHANCE_MULTIPLIER) {
         const position = Board.getRandomPositionInTile(x, y);

         const tombstone = new Tombstone(position);
         Board.addEntity(tombstone);
      }
   }

   public static runSpawnAttempt(): void {
      const MAX_SPAWN_ATTEMPTS = 50;

      // Spawn mobs
      // Find a random tile in the world which can spawn mobs, and spawn a random mob on it
      if (Math.random() <= this.MOB_SPAWN_RATE * Board.size * Board.size / SETTINGS.tps) {
         let spawnAttempts = 0;
         while (true) {
            const tileX = randInt(0, Board.dimensions - 1);
            const tileY = randInt(0, Board.dimensions - 1);

            const tile = Board.getTile(tileX, tileY);

            const eligibleMobs = getEligibleEntities(tile, "mob") as Array<MobInfo>;
            if (eligibleMobs !== null) {
               const mobInfo = randItem(eligibleMobs);

               if (typeof mobInfo.spawnChance !== "undefined" && Math.random() > mobInfo.spawnChance) {
                  continue;
               }

               this.spawnMobs([tileX, tileY], mobInfo);
               break;
            }

            spawnAttempts++;
            if (spawnAttempts >= MAX_SPAWN_ATTEMPTS) {
               break;
            }
         }
      }

      // Spawn resources
      for (let chunkY = 0; chunkY < Board.size; chunkY++) {
         for (let chunkX = 0; chunkX < Board.size; chunkX++) {
            if (Math.random() < this.RESOURCE_SPAWN_CHANCE) {
               this.spawnResourceInChunk(chunkX, chunkY);
            }
         }   
      }

      this.spawnTombstones();
   }

   public static spawnInitialEntities(): void {
      this.spawnInitialMobs();

      // Spawn resources
      for (let chunkY = 0; chunkY < Board.size; chunkY++) {
         for (let chunkX = 0; chunkX < Board.size; chunkX++) {
            // 0.5 chance to spawn resource recursively
            while (Math.random() < 0.5) {
               this.spawnResourceInChunk(chunkX, chunkY);
            }
         }   
      }
   }
}

export default EntitySpawner;