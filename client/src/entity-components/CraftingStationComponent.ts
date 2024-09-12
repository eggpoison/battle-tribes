import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class CraftingStationComponent extends ServerComponent {
   public readonly craftingStation: CraftingStation;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.craftingStation = reader.readNumber();
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default CraftingStationComponent;

export const CraftingStationComponentArray = new ComponentArray<CraftingStationComponent>(ComponentArrayType.server, ServerComponentType.craftingStation, true, {});