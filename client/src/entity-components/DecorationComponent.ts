import { PacketReader } from "battletribes-shared/packets";
import ServerComponent from "./ServerComponent";
import { DecorationType } from "battletribes-shared/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class DecorationComponent extends ServerComponent {
   public decorationType: DecorationType = 0;
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.decorationType = reader.readNumber();
   }
}

export default DecorationComponent;

export const DecorationComponentArray = new ComponentArray<DecorationComponent>(ComponentArrayType.server, ServerComponentType.decoration, true, {});