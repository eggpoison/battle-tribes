import { DecorationType, ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

export class DecorationComponent {
   public decorationType: DecorationType;

   constructor(decorationType: DecorationType) {
      this.decorationType = decorationType;
   }
}

export const DecorationComponentArray = new ComponentArray<DecorationComponent>(ServerComponentType.decoration, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
})

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const decorationComponent = DecorationComponentArray.getComponent(entity);

   packet.addNumber(decorationComponent.decorationType);
}