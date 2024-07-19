import { CowComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { randInt } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
import Board from "../Board";
import { createDirtParticle } from "../particles";
import { AudioFilePath, playSound } from "../sound";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { CowSpecies } from "webgl-test-shared/dist/entities";

class CowComponent extends ServerComponent<ServerComponentType.cow> {
   public readonly species: CowSpecies;
   private grazeProgress: number;

   constructor(entity: Entity, data: CowComponentData) {
      super(entity);

      this.species = data.species;
      this.grazeProgress = data.grazeProgress;
   }

   public tick(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);

      if (this.grazeProgress !== -1 && Board.tickIntervalHasPassed(0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createDirtParticle(spawnPositionX, spawnPositionY, ParticleRenderLayer.low);
      }

      if (Math.random() < 0.1 / Settings.TPS) {
         playSound(("cow-ambient-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.2, 1, transformComponent.position);
      }
   }

   public updateFromData(data: CowComponentData): void {
      // When the cow has finished grazing, create a bunch of dirt particles
      if (data.grazeProgress < this.grazeProgress) {
         const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
         for (let i = 0; i < 15; i++) {
            const x = (transformComponent.tile.x + Math.random()) * Settings.TILE_SIZE;
            const y = (transformComponent.tile.y + Math.random()) * Settings.TILE_SIZE;
            createDirtParticle(x, y, ParticleRenderLayer.low);
         }
      }
      this.grazeProgress = data.grazeProgress;
   }
}

export default CowComponent;