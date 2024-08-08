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
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class TombstoneComponent extends ServerComponent {
   public readonly tombstoneType: number;
   public zombieSpawnProgress: number;
   public zombieSpawnX: number;
   public zombieSpawnY: number;
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

export const TombstoneComponentArray = new ComponentArray<TombstoneComponent>(ComponentArrayType.server, ServerComponentType.tombstone, {
   onTick: onTick
});

function onTick(tombstoneComponent: TombstoneComponent): void {
   if (tombstoneComponent.zombieSpawnProgress !== -1) {
      // Create zombie digging particles
      if (tombstoneComponent.zombieSpawnProgress < 0.8) {
         if (Math.random() < 7.5 / Settings.TPS) {
            createDirtParticle(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY, ParticleRenderLayer.low);
         }
      } else {
         if (Math.random() < 20 / Settings.TPS) {
            createDirtParticle(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY, ParticleRenderLayer.low);
         }
      }

      const transformComponent = tombstoneComponent.entity.getServerComponent(ServerComponentType.transform);
      if (transformComponent.ageTicks % 6 === 0) {
         playSound(("zombie-dig-" + randInt(1, 5) + ".mp3") as AudioFilePath, 0.15, 1, new Point(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY));
      }
   }
}