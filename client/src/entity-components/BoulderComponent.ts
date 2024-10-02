import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class BoulderComponent extends ServerComponent {
   public boulderType = 0;
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      this.boulderType = reader.readNumber();
   }
}

export default BoulderComponent;

export const BoulderComponentArray = new ComponentArray<BoulderComponent>(ComponentArrayType.server, ServerComponentType.boulder, true, {});