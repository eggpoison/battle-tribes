import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class AIHelperComponent extends ServerComponent {
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default AIHelperComponent;

export const AIHelperComponentArray = new ComponentArray<AIHelperComponent>(ComponentArrayType.server, ServerComponentType.aiHelper, true, {});