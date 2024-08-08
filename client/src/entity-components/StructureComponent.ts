import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class StructureComponent extends ServerComponent {
   public hasActiveBlueprint: boolean;
   public connectedSidesBitset: number;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.hasActiveBlueprint = reader.readBoolean();
      reader.padOffset(3);
      this.connectedSidesBitset = reader.readNumber();
   }

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

export const StructureComponentArray = new ComponentArray<StructureComponent>(ComponentArrayType.server, ServerComponentType.structure, {});