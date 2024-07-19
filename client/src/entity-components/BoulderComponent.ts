import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";

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