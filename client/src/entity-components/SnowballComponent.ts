import { SnowballSize } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";

class SnowballComponent extends ServerComponent {
   public readonly size: SnowballSize;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.size = reader.readNumber();
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default SnowballComponent;