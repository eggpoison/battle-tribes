import { ScarInfo, ServerComponentType } from "../../../shared/dist/components.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { ComponentArray } from "./ComponentArray.js";

export class TribeWarriorComponent {
   public readonly scars: readonly ScarInfo[];

   constructor(scars: readonly ScarInfo[]) {
      this.scars = scars;
   }
}

export const TribeWarriorComponentArray = new ComponentArray<TribeWarriorComponent>(ServerComponentType.tribeWarrior, true, getDataLength, addDataToPacket);

function getDataLength(entity: Entity): number {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity);
   return Bytes.Float32 + 4 * Bytes.Float32 * tribeWarriorComponent.scars.length;
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