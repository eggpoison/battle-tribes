import { PacketReader } from "battletribes-shared/packets";
import ServerComponent from "./ServerComponent";
import { DecorationType } from "battletribes-shared/components";
import Entity from "../Entity";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class DecorationComponent extends ServerComponent {
   public readonly decorationType: DecorationType;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.decorationType = reader.readNumber();
   }
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default DecorationComponent;

export const DecorationComponentArray = new ComponentArray<DecorationComponent>(ComponentArrayType.server, ServerComponentType.decoration, true, {});