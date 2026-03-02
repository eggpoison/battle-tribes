import { ScarInfo, ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

export class TribeWarriorComponent {
   public readonly scars: ReadonlyArray<ScarInfo>;

   constructor(scars: ReadonlyArray<ScarInfo>) {
      this.scars = scars;
   }
}

export const TribeWarriorComponentArray = new ComponentArray<TribeWarriorComponent>(ServerComponentType.tribeWarrior, true, getDataLength, addDataToPacket);

function getDataLength(entity: Entity): number {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity);
   return Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT * tribeWarriorComponent.scars.length;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity);

   packet.writeNumber(tribeWarriorComponent.scars.length);
   for (let i = 0; i < tribeWarriorComponent.scars.length; i++) {
      const scar = tribeWarriorComponent.scars[i];

      packet.writeNumber(scar.offsetX);
      packet.writeNumber(scar.offsetY);
      packet.writeNumber(scar.rotation);
      packet.writeNumber(scar.type);
   }
}