import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

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

export const FollowAIComponentArray = new ComponentArray<FollowAIComponent>(ComponentArrayType.server, ServerComponentType.followAI, true, {});