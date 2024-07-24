import { ServerComponentType, TombstoneComponentData } from "webgl-test-shared/dist/components";
import { DeathInfo, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createDirtParticle } from "../particles";
import { playSound, AudioFilePath } from "../sound";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { PacketReader } from "webgl-test-shared/dist/packets";

class TombstoneComponent extends ServerComponent {
   public readonly tombstoneType: number;
   private zombieSpawnProgress: number;
   private zombieSpawnX: number;
   private zombieSpawnY: number;
   public readonly deathInfo: DeathInfo | null;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.tombstoneType = reader.readNumber();
      this.zombieSpawnProgress = reader.readNumber();
      this.zombieSpawnX = reader.readNumber();
      this.zombieSpawnY = reader.readNumber();

      const hasDeathInfo = reader.readBoolean();
      reader.padOffset(3);
      if (hasDeathInfo) {
         // @Hack: hardcoded
         const username = reader.readString(100);
         const causeOfDeath = reader.readNumber() as PlayerCauseOfDeath;
         this.deathInfo = {
            username: username,
            causeOfDeath: causeOfDeath
         };
      } else {
         this.deathInfo = null;
      }
   }

   public tick(): void {
      if (this.zombieSpawnProgress !== -1) {
         // Create zombie digging particles
         if (this.zombieSpawnProgress < 0.8) {
            if (Math.random() < 7.5 / Settings.TPS) {
               createDirtParticle(this.zombieSpawnX, this.zombieSpawnY, ParticleRenderLayer.low);
            }
         } else {
            if (Math.random() < 20 / Settings.TPS) {
               createDirtParticle(this.zombieSpawnX, this.zombieSpawnY, ParticleRenderLayer.low);
            }
         }

         const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
         if (transformComponent.ageTicks % 6 === 0) {
            playSound(("zombie-dig-" + randInt(1, 5) + ".mp3") as AudioFilePath, 0.15, 1, new Point(this.zombieSpawnX, this.zombieSpawnY));
         }
      }
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);

      const hasDeathInfo = reader.readBoolean();
      reader.padOffset(3);
      if (hasDeathInfo) {
         reader.padOffset(Float32Array.BYTES_PER_ELEMENT + 100 + Float32Array.BYTES_PER_ELEMENT);
      }
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT)
      this.zombieSpawnProgress = reader.readNumber();
      this.zombieSpawnX = reader.readNumber();
      this.zombieSpawnY = reader.readNumber();

      const hasDeathInfo = reader.readBoolean();
      reader.padOffset(3);
      if (hasDeathInfo) {
         reader.padOffset(100 + Float32Array.BYTES_PER_ELEMENT);
      }
   }
}

export default TombstoneComponent;