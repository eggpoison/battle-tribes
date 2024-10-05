import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { Packet } from "battletribes-shared/packets";
import { EntityID } from "battletribes-shared/entities";

export class CraftingStationComponent {
   public readonly craftingStation: CraftingStation;
   
   constructor(craftingStation: CraftingStation) {
      this.craftingStation = craftingStation;
   }
}

export const CraftingStationComponentArray = new ComponentArray<CraftingStationComponent>(ServerComponentType.craftingStation, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const craftingStationComponent = CraftingStationComponentArray.getComponent(entity);

   packet.addNumber(craftingStationComponent.craftingStation);
}