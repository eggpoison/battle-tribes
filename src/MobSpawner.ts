import Board, { TileCoordinates } from "./Board";
import MOB_INFO_RECORD, { MobInfo } from "./mob-info";
import SETTINGS from "./settings";
import { TileType } from "./tiles";
import { randInt, randItem } from "./utils";

const getEligibleMobs = (tileType: TileType): Array<MobInfo> => {
   const eligibleMobs = new Array<MobInfo>();

   for (const mobInfo of Object.values(MOB_INFO_RECORD)) {
      if (mobInfo.preferredTileTypes.includes(tileType)) {
         eligibleMobs.push(mobInfo);
      }
   }

   return eligibleMobs;
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

   public static runSpawnAttempt(): void {
      if (this.mobCount < this.targetMobCount && Math.random() <= this.MOB_SPAWN_RATE * Board.size * Board.size / SETTINGS.tps) {
         let chosenSpawnTileCoordinates!: [number, number];

         while (typeof chosenSpawnTileCoordinates === "undefined") {
            const tileX = randInt(0, Board.dimensions - 1);
            const tileY = randInt(0, Board.dimensions - 1);

            const tileType = Board.getTileType(tileX, tileY);

            const eligibleMobs = getEligibleMobs(tileType);
            if (eligibleMobs.length > 0) {
               const mobInfo = randItem(eligibleMobs);

               this.spawnMobs([tileX, tileY], mobInfo);
               break;
            } else {
               continue;
            }
         }
      }
   }

   public static updateMobCount(mobCount: number): void {
      this.mobCount = mobCount;
   }
}

export default MobSpawner;