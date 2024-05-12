import { ServerComponentType, TombstoneComponentData } from "webgl-test-shared/dist/components";
import { DeathInfo } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { randInt } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createDirtParticle } from "../particles";
import { playSound, AudioFilePath } from "../sound";

class TombstoneComponent extends ServerComponent<ServerComponentType.tombstone> {
   private zombieSpawnProgress: number;
   private zombieSpawnX: number;
   private zombieSpawnY: number;
   public readonly deathInfo: DeathInfo | null;

   constructor(entity: Entity, data: TombstoneComponentData) {
      super(entity);

      this.zombieSpawnProgress = data.zombieSpawnProgress;
      this.zombieSpawnX = data.zombieSpawnX;
      this.zombieSpawnY = data.zombieSpawnY;
      this.deathInfo = data.deathInfo;
   }

   public tick(): void {
      if (this.zombieSpawnProgress !== -1) {
         // Create zombie digging particles
         if (this.zombieSpawnProgress < 0.8) {
            if (Math.random() < 7.5 / Settings.TPS) {
               createDirtParticle(this.zombieSpawnX, this.zombieSpawnY);
            }
         } else {
            if (Math.random() < 20 / Settings.TPS) {
               createDirtParticle(this.zombieSpawnX, this.zombieSpawnY);
            }
         }
         if (this.entity.ageTicks % 6 === 0) {
            playSound(("zombie-dig-" + randInt(1, 5) + ".mp3") as AudioFilePath, 0.15, 1, this.zombieSpawnX, this.zombieSpawnY);
         }
      }
   }
   
   public updateFromData(data: TombstoneComponentData): void {
      this.zombieSpawnProgress = data.zombieSpawnProgress;
      this.zombieSpawnX = data.zombieSpawnX;
      this.zombieSpawnY = data.zombieSpawnY;
   }
}

export default TombstoneComponent;