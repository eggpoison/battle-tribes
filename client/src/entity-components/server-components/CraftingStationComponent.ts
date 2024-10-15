import ServerComponent from "../ServerComponent";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";

class CraftingStationComponent extends ServerComponent {
   public craftingStation = CraftingStation.workbench;
}

export default CraftingStationComponent;

export const CraftingStationComponentArray = new ServerComponentArray<CraftingStationComponent>(ServerComponentType.craftingStation, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const craftingStationComponent = CraftingStationComponentArray.getComponent(entity);
   craftingStationComponent.craftingStation = reader.readNumber();
}