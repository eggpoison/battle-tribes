import { ScarInfo, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

export interface TribeWarriorComponentParams {
   readonly scars: ReadonlyArray<ScarInfo>;
}

export class TribeWarriorComponent {
   public readonly scars: ReadonlyArray<ScarInfo>;

   constructor(params: TribeWarriorComponentParams) {
      this.scars = params.scars;
   }
}

export const TribeWarriorComponentArray = new ComponentArray<TribeWarriorComponent>(ServerComponentType.tribeWarrior, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(entity: EntityID): number {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity);
   return 2 * Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT * tribeWarriorComponent.scars.length;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity);

   packet.addNumber(tribeWarriorComponent.scars.length);
   for (let i = 0; i < tribeWarriorComponent.scars.length; i++) {
      const scar = tribeWarriorComponent.scars[i];

      packet.addNumber(scar.offsetX);
      packet.addNumber(scar.offsetY);
      packet.addNumber(scar.rotation);
      packet.addNumber(scar.type);
   }
}