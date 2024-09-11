import { DecorationType, ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

export interface DecorationComponentParams {
   decorationType: DecorationType;
}

export class DecorationComponent {
   public readonly decorationType: DecorationType;

   constructor(params: DecorationComponentParams) {
      this.decorationType = params.decorationType;
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