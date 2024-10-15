import { ServerComponentType } from "battletribes-shared/components";
import { DeathInfo, EntityID, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import ServerComponent from "../ServerComponent";
import { createDirtParticle } from "../../particles";
import { playSound } from "../../sound";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { PacketReader } from "battletribes-shared/packets";
import { getEntityAgeTicks } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

class TombstoneComponent extends ServerComponent {
   public tombstoneType = 0;
   public zombieSpawnProgress = 0;
   public zombieSpawnX = -1;
   public zombieSpawnY = -1;
   public deathInfo: DeathInfo | null = null;
}

export default TombstoneComponent;

export const TombstoneComponentArray = new ServerComponentArray<TombstoneComponent>(ServerComponentType.tombstone, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function onTick(tombstoneComponent: TombstoneComponent, entity: EntityID): void {
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

      if (getEntityAgeTicks(entity) % 6 === 0) {
         playSound("zombie-dig-" + randInt(1, 5) + ".mp3", 0.15, 1, new Point(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY));
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);

   const hasDeathInfo = reader.readBoolean();
   reader.padOffset(3);
   if (hasDeathInfo) {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT + 100 + Float32Array.BYTES_PER_ELEMENT);
   }
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
   
   tombstoneComponent.tombstoneType = reader.readNumber();
   tombstoneComponent.zombieSpawnProgress = reader.readNumber();
   tombstoneComponent.zombieSpawnX = reader.readNumber();
   tombstoneComponent.zombieSpawnY = reader.readNumber();

   const hasDeathInfo = reader.readBoolean();
   reader.padOffset(3);
   if (hasDeathInfo) {
      // @Hack: hardcoded
      const username = reader.readString(100);
      const causeOfDeath = reader.readNumber() as PlayerCauseOfDeath;
      tombstoneComponent.deathInfo = {
         username: username,
         causeOfDeath: causeOfDeath
      };
   } else {
      tombstoneComponent.deathInfo = null;
   }
}