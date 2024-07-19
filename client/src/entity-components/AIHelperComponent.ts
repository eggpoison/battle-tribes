import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";

class AIHelperComponent extends ServerComponent {
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default AIHelperComponent;