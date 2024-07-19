import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";

class FollowAIComponent extends ServerComponent {
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }
}

export default FollowAIComponent;