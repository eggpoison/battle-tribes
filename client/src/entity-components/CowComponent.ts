import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { randInt } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
import Board from "../Board";
import { createDirtParticle } from "../particles";
import { AudioFilePath, playSound } from "../sound";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { CowSpecies } from "webgl-test-shared/dist/entities";
import { PacketReader } from "webgl-test-shared/dist/packets";

class CowComponent extends ServerComponent {
   public readonly species: CowSpecies;
   private grazeProgress: number;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.species = reader.readNumber();
      this.grazeProgress = reader.readNumber();
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

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(4);
      const grazeProgress = reader.readNumber();
      
      // When the cow has finished grazing, create a bunch of dirt particles
      if (grazeProgress < this.grazeProgress) {
         const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
         for (let i = 0; i < 15; i++) {
            const x = (transformComponent.tile.x + Math.random()) * Settings.TILE_SIZE;
            const y = (transformComponent.tile.y + Math.random()) * Settings.TILE_SIZE;
            createDirtParticle(x, y, ParticleRenderLayer.low);
         }
      }
      this.grazeProgress = grazeProgress;
   }
}

export default CowComponent;