import Board, { TileCoordinates } from "./Board";
import MOB_INFO_RECORD, { MobInfo } from "./mob-info";
import SETTINGS from "./settings";
import { TileType } from "./tiles";
import { randInt, randItem } from "./utils";

const getEligibleMobs = (tileType: TileType): Array<MobInfo> | null => {
   const eligibleMobs = new Array<MobInfo>();

   for (const mobInfo of Object.values(MOB_INFO_RECORD)) {
      if (mobInfo.preferredTileTypes.includes(tileType)) {
         eligibleMobs.push(mobInfo);
      }
   }

   if (eligibleMobs.length > 0) return eligibleMobs;
   return null;
}

abstract class MobSpawner {
   /** The chance that mob spawning is done in a chunk each second */
   private static MOB_SPAWN_RATE = 0.02;

   /** The target number of entities in a chunk */
   private static TARGET_MOB_COUNT = 0.1;
   private static targetMobCount: number;

   /** How many tiles away from a spawn position a mob can spawn */
   private static SPAWN_RADIUS = 2;

   private static mobCount: number = 0;

   public static setup(): void {
      this.targetMobCount = Math.floor(this.TARGET_MOB_COUNT * Board.size * Board.size);
   }

   public static updateMobCount(mobCount: number): void {
      this.mobCount = mobCount;
   }

   private static spawnMobs(tileCoordinates: TileCoordinates, mobInfo: MobInfo): void {
      const mobConstr = mobInfo.getConstr();

      let spawnAmount!: number;
      if (typeof mobInfo.packSize === "number") {
         spawnAmount = mobInfo.packSize;
      } else {
         spawnAmount = randInt(...mobInfo.packSize);
      }

      for (let i = 0; i < spawnAmount; i++) {
         const x = tileCoordinates[0] + randInt(-this.SPAWN_RADIUS, this.SPAWN_RADIUS);
         const y = tileCoordinates[1] + randInt(-this.SPAWN_RADIUS, this.SPAWN_RADIUS);

         const position = Board.getRandomPositionInTile([x, y]);

         const mob = new mobConstr(position);
         Board.addEntity(mob);
      }
   }

   public static spawnInitialMobs(): void {
      // Each chunk has a 2/10 chance to spawn a random mob
      const SPAWN_CHANCE = 0.2;

      const SPAWN_RANGE = 2;

      for (let chunkY = 0; chunkY < Board.size; chunkY++) {
         for (let chunkX = 0; chunkX < Board.size; chunkX++) {
            if (Math.random() >= SPAWN_CHANCE) continue;

            const startTileX = chunkX * Board.chunkSize + randInt(0, Board.chunkSize - 1);
            const startTileY = chunkY * Board.chunkSize + randInt(0, Board.chunkSize - 1);

            yLoop: for (let y = Math.max(startTileY - SPAWN_RANGE, 0); y <= Math.min(startTileY + SPAWN_RANGE, Board.dimensions - 1); y++) {
               for (let x = Math.max(startTileX - SPAWN_RANGE, 0); x <= Math.min(startTileX + SPAWN_RANGE, Board.dimensions - 1); x++) {
                  const tileType = Board.getTileType(x, y);

                  const eligibleMobs = getEligibleMobs(tileType);

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

   public static runSpawnAttempt(): void {
      if (this.mobCount < this.targetMobCount && Math.random() <= this.MOB_SPAWN_RATE * Board.size * Board.size / SETTINGS.tps) {
         let chosenSpawnTileCoordinates!: [number, number];

         while (typeof chosenSpawnTileCoordinates === "undefined") {
            const tileX = randInt(0, Board.dimensions - 1);
            const tileY = randInt(0, Board.dimensions - 1);

            const tileType = Board.getTileType(tileX, tileY);

            const eligibleMobs = getEligibleMobs(tileType);
            if (eligibleMobs !== null) {
               const mobInfo = randItem(eligibleMobs);

               this.spawnMobs([tileX, tileY], mobInfo);
               break;
            } else {
               continue;
            }
         }
      }
   }
}

export default MobSpawner;