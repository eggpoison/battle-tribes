import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class PlayerComponent extends ServerComponent {
   public readonly username: string;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.username = reader.readString(100);
      // @Incomplete
      console.log(this.username);
      console.log(this.username.trim());
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT + 100);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT + 100);
   }
}

export default PlayerComponent;

export const PlayerComponentArray = new ComponentArray<PlayerComponent>(ComponentArrayType.server, ServerComponentType.player, true, {});