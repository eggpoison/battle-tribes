import { DeathInfo, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import Entity from "./Entity";
import { PlayerComponentArray } from "./components/ComponentArray";

abstract class TombstoneDeathManager {
   private static readonly MAX_TRACKED_DEATHS = 100;

   private static readonly deathInfos = new Array<DeathInfo>();
   
   public static registerNewDeath(player: Entity, causeOfDeath: PlayerCauseOfDeath): void {
      // If the max number of deaths has been exceeded, remove the first one
      if (this.deathInfos.length === this.MAX_TRACKED_DEATHS) {
         this.deathInfos.shift();
      }

      const playerComponent = PlayerComponentArray.getComponent(player.id);
      
      this.deathInfos.push({
         username: playerComponent.username,
         causeOfDeath: causeOfDeath
      });
   }
   
   public static popDeath(): DeathInfo | null {
      if (this.deathInfos.length === 0) {
         return null;
      }
      
      const deathInfo = this.deathInfos[0];
      this.deathInfos.shift();
      return deathInfo;
   }
}

export default TombstoneDeathManager;