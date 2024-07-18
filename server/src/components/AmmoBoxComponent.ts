import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { BallistaAmmoType, ItemType } from "webgl-test-shared/dist/items/items";
import { Packet } from "webgl-test-shared/dist/packets";

export interface AmmoBoxComponentParams {}

export class AmmoBoxComponent {
   public ammoType: BallistaAmmoType = ItemType.wood;
   public ammoRemaining = 0;
}

export const AmmoBoxComponentArray = new ComponentArray<AmmoBoxComponent>(ServerComponentType.ammoBox, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entityID: number): void {
   const ballistaComponent = AmmoBoxComponentArray.getComponent(entityID);

   packet.addNumber(ballistaComponent.ammoType);
   packet.addNumber(ballistaComponent.ammoRemaining);
}