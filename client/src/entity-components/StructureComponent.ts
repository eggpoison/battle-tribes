import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class StructureComponent extends ServerComponent {
   public hasActiveBlueprint = false;
   public connectedSidesBitset = 0;

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.hasActiveBlueprint = reader.readBoolean();
      reader.padOffset(3);
      this.connectedSidesBitset = reader.readNumber();
   }
}

export default StructureComponent;

export const StructureComponentArray = new ComponentArray<StructureComponent>(ComponentArrayType.server, ServerComponentType.structure, true, {});