import { ServerComponentType, TurretAmmoType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { ItemType } from "battletribes-shared/items/items";
import { Packet } from "battletribes-shared/packets";

export class AmmoBoxComponent {
   public ammoType: TurretAmmoType = ItemType.wood;
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