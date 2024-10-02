import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class PlayerComponent extends ServerComponent {
   public username = "";
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT + 100);
   }
   
   public updateFromData(reader: PacketReader): void {
      this.username = reader.readString(100);
   }
}

export default PlayerComponent;

export const PlayerComponentArray = new ComponentArray<PlayerComponent>(ComponentArrayType.server, ServerComponentType.player, true, {});