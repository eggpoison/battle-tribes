import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class BoulderComponent extends ServerComponent {
   public readonly boulderType: number;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.boulderType = reader.readNumber();
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default BoulderComponent;

export const BoulderComponentArray = new ComponentArray<BoulderComponent>(ComponentArrayType.server, ServerComponentType.boulder, true, {});