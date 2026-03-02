import { DeathInfo, Entity, DamageSource } from "battletribes-shared/entities";
import { PlayerComponentArray } from "./components/PlayerComponent";

// @Cleanup: don't use singletons!
abstract class TombstoneDeathManager {
   private static readonly MAX_TRACKED_DEATHS = 100;

   private static readonly deathInfos = new Array<DeathInfo>();
   
   public static registerNewDeath(player: Entity, damageSource: DamageSource): void {
      // If the max number of deaths has been exceeded, remove the first one
      if (this.deathInfos.length === this.MAX_TRACKED_DEATHS) {
         this.deathInfos.shift();
      }

      const playerComponent = PlayerComponentArray.getComponent(player);
      
      this.deathInfos.push({
         username: playerComponent.client.username,
         damageSource: damageSource
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