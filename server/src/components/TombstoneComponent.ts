import { ServerComponentType } from "webgl-test-shared/dist/components";
import { DeathInfo, EntityID } from "webgl-test-shared/dist/entities";
import { getZombieSpawnProgress } from "../entities/tombstone";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "webgl-test-shared/dist/packets";

export interface TombstoneComponentParams {
   readonly tombstoneType: number;
   readonly deathInfo: DeathInfo | null;
}

export class TombstoneComponent {
   public readonly tombstoneType: number;

   /** Amount of spawned zombies that are alive currently */
   public numZombies = 0;
   public isSpawningZombie = false;
   public zombieSpawnTimer = 0;
   public zombieSpawnPositionX = -1;
   public zombieSpawnPositionY = -1;

   // @Speed: Polymorphism
   public readonly deathInfo: DeathInfo | null;

   constructor(params: TombstoneComponentParams) {
      this.tombstoneType = params.tombstoneType;
      this.deathInfo = params.deathInfo;
   }
}

export const TombstoneComponentArray = new ComponentArray<TombstoneComponent>(ServerComponentType.tombstone, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(entity: EntityID): number {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
   
   let lengthBytes = 6 * Float32Array.BYTES_PER_ELEMENT;
   if (tombstoneComponent.deathInfo !== null) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT + 100 + Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity);

   packet.addNumber(tombstoneComponent.tombstoneType);
   packet.addNumber(getZombieSpawnProgress(tombstoneComponent));
   packet.addNumber(tombstoneComponent.zombieSpawnPositionX);
   packet.addNumber(tombstoneComponent.zombieSpawnPositionY);

   packet.addBoolean(tombstoneComponent.deathInfo !== null);
   packet.padOffset(3);
   if (tombstoneComponent.deathInfo !== null) {
      // @Hack: hardcoded
      packet.addString(tombstoneComponent.deathInfo.username, 100);
      packet.addNumber(tombstoneComponent.deathInfo.causeOfDeath);
   }
}