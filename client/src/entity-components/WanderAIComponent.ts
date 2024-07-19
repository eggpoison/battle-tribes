import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";

class WanderAIComponent extends ServerComponent {
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      reader.padOffset(Float32Array.BYTES_PER_ELEMENT * 2);
   }
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT * 2);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT * 2);
   }
}

export default WanderAIComponent;