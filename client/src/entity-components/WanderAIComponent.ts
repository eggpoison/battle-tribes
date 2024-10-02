import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class WanderAIComponent extends ServerComponent {
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT * 2);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT * 2);
   }
}

export default WanderAIComponent;

export const WanderAIComponentArray = new ComponentArray<WanderAIComponent>(ComponentArrayType.server, ServerComponentType.wanderAI, true, {});