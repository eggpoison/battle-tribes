import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";

class PlayerComponent extends ServerComponent {
   public readonly username: string;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.username = reader.readString(100);
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(100);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(100);
   }
}

export default PlayerComponent;