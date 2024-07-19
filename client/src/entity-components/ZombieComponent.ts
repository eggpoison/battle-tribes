import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
import { PacketReader } from "webgl-test-shared/dist/packets";

class ZombieComponent extends ServerComponent {
   public readonly zombieType: number;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.zombieType = reader.readNumber();
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default ZombieComponent;