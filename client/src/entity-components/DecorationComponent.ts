import { PacketReader } from "webgl-test-shared/dist/packets";
import ServerComponent from "./ServerComponent";
import { DecorationType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";

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