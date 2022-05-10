import Board from "../Board";
import RESOURCE_INFO, { ResourceInfo } from "../resource-info";
import SETTINGS from "../settings";
import { getTileDistFromCenter, TileType } from "../tiles";
import { randInt } from "../utils";

abstract class ResourceSpawner {
   private static SPAWN_CHANCE = 0.05 / SETTINGS.tps;

   private static getEligibleResources(tileType: TileType, dist: number): ReadonlyArray<ResourceInfo> | null {
      const eligibleResources = new Array<ResourceInfo>();

      for (const info of Object.values(RESOURCE_INFO)) {
         // Don't add if the tile isn't a required tile type
         if (typeof info.spawnRequirements.tileTypes !== "undefined") {
            if (!info.spawnRequirements.tileTypes.includes(tileType)) {
               continue;
            }
         }

         // Don't add if the resource isn't in the right distance
         if (typeof info.spawnRequirements.minDist !== "undefined") {
            if (dist < info.spawnRequirements.minDist) continue;
         }
         if (typeof info.spawnRequirements.maxDist !== "undefined") {
            if (dist > info.spawnRequirements.maxDist) continue;
         }

         eligibleResources.push(info);
      }
      
      if (eligibleResources.length === 0) return null;
      return eligibleResources;
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
      const x = chunkX * Board.chunkSize + randInt(0, Board.chunkSize - 1);
      const y = chunkY * Board.chunkSize + randInt(0, Board.chunkSize - 1);

      const tileType = Board.getTileType(x, y);

      const dist = getTileDistFromCenter(x, y);
      const eligibleResources = this.getEligibleResources(tileType, dist);

      if (eligibleResources !== null) {
         const info = this.getRandomResource(eligibleResources);
         const constr = info.getConstr();
         const position = Board.getRandomPositionInTile([x, y]);
         
         const resource = new constr(position);
         Board.addEntity(resource);
      }
   }

   public static runSpawnAttempt(): void {
      for (let chunkY = 0; chunkY < Board.size; chunkY++) {
         for (let chunkX = 0; chunkX < Board.size; chunkX++) {
            if (Math.random() < this.SPAWN_CHANCE) {
               this.spawnResourceInChunk(chunkX, chunkY);
            }
         }   
      }
   }

   public static spawnInitialResources(): void {
      for (let chunkY = 0; chunkY < Board.size; chunkY++) {
         for (let chunkX = 0; chunkX < Board.size; chunkX++) {
            // 0.5 chance to spawn resource (recursively)
            while (Math.random() < 0.5) {
               this.spawnResourceInChunk(chunkX, chunkY);
            }
         }   
      }
   }
}

export default ResourceSpawner;