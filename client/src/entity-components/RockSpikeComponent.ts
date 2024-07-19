import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";

class RockSpikeComponent extends ServerComponent {
   public readonly size: number;
   public readonly lifetime: number;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.size = reader.readNumber();
      this.lifetime = reader.readNumber();
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }
}

export default RockSpikeComponent;