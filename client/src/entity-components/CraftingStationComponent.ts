import ServerComponent from "./ServerComponent";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class CraftingStationComponent extends ServerComponent {
   public craftingStation = CraftingStation.workbench;

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.craftingStation = reader.readNumber();
   }
}

export default CraftingStationComponent;

export const CraftingStationComponentArray = new ComponentArray<CraftingStationComponent>(ComponentArrayType.server, ServerComponentType.craftingStation, true, {});