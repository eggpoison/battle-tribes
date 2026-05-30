import { Packet, Entity, DecorationType, ServerComponentType } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { ComponentArray } from "./ComponentArray.js";

export class DecorationComponent {
   public decorationType: DecorationType;

   constructor(decorationType: DecorationType) {
      this.decorationType = decorationType;
   }
}

export const DecorationComponentArray = new ComponentArray<DecorationComponent>(ServerComponentType.decoration, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const decorationComponent = DecorationComponentArray.getComponent(entity);
   packet.writeNumber(decorationComponent.decorationType);
}