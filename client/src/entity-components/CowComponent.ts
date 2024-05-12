import { CowComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { randInt } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
import Board from "../Board";
import { createDirtParticle } from "../particles";
import { AudioFilePath, playSound } from "../sound";

class CowComponent extends ServerComponent<ServerComponentType.cow> {
   private grazeProgress: number;

   constructor(entity: Entity, data: CowComponentData) {
      super(entity);

      this.grazeProgress = data.grazeProgress;
   }

   public tick(): void {
      if (this.grazeProgress !== -1 && Board.tickIntervalHasPassed(0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.entity.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.entity.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createDirtParticle(spawnPositionX, spawnPositionY);
      }

      if (Math.random() < 0.1 / Settings.TPS) {
         playSound(("cow-ambient-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.2, 1, this.entity.position.x, this.entity.position.y);
      }
   }

   public updateFromData(data: CowComponentData): void {
      // When the cow has finished grazing, create a bunch of dirt particles
      if (data.grazeProgress < this.grazeProgress) {
         for (let i = 0; i < 15; i++) {
            const x = (this.entity.tile.x + Math.random()) * Settings.TILE_SIZE;
            const y = (this.entity.tile.y + Math.random()) * Settings.TILE_SIZE;
            createDirtParticle(x, y);
         }
      }
      this.grazeProgress = data.grazeProgress;
   }
}

export default CowComponent;