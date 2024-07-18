import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

export interface ZombieComponentParams {
   zombieType: number;
   tombstone: EntityID;
}

export class ZombieComponent {
   /** The type of the zombie, 0-3 */
   public readonly zombieType: number;
   public readonly tombstone: EntityID;

   /** Maps the IDs of entities which have attacked the zombie to the number of ticks that they should remain in the object for */
   public readonly attackingEntityIDs: Partial<Record<number, number>> = {};

   /** Cooldown before the zombie can do another attack */
   public attackCooldownTicks = 0;

   public visibleHurtEntityID = 0;
   /** Ticks since the visible hurt entity was last hit */
   public visibleHurtEntityTicks = 0;
   
   constructor(params: ZombieComponentParams) {
      this.zombieType = params.zombieType;
      this.tombstone = params.tombstone;
   }
}

export const ZombieComponentArray = new ComponentArray<ZombieComponent>(ServerComponentType.zombie, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const zombieComponent = ZombieComponentArray.getComponent(entity);
   packet.addNumber(zombieComponent.zombieType);
}