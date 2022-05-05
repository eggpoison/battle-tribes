import Board from "../Board";
import RESOURCE_INFO, { ResourceInfo } from "../resource-info";
import SETTINGS from "../settings";
import { TileType } from "../tiles";
import { randInt } from "../utils";

abstract class ResourceSpawner {
   private static SPAWN_CHANCE = 0.05 / SETTINGS.tps;

   private static getEligibleResources(tileType: TileType): ReadonlyArray<ResourceInfo> | null {
      const eligibleResources = new Array<ResourceInfo>();

      for (const info of Object.values(RESOURCE_INFO)) {
         if (info.tiles.includes(tileType)) eligibleResources.push(info);
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

         currentWeight += newWeight;
      }

      throw new Error("Couldn't get resource from resource list!");
   }

   private static spawnResourceInChunk(chunkX: number, chunkY: number): void {
      const x = chunkX * Board.chunkSize + randInt(0, Board.chunkSize - 1);
      const y = chunkY * Board.chunkSize + randInt(0, Board.chunkSize - 1);

      const tileType = Board.getTileType(x, y);

      const eligibleResources = this.getEligibleResources(tileType);

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
}

export default ResourceSpawner;