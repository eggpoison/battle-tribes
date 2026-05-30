import { ScarInfo, ServerComponentType, Entity, Packet } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { ComponentArray } from "./ComponentArray.js";

export class TribeWarriorComponent {
   public readonly scars: ReadonlyArray<ScarInfo>;

   constructor(scars: ReadonlyArray<ScarInfo>) {
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