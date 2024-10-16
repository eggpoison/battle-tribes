import { PacketReader } from "battletribes-shared/packets";
import { DecorationType } from "battletribes-shared/components";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";

class DecorationComponent {
   public decorationType: DecorationType = 0;
}

export default DecorationComponent;

export const DecorationComponentArray = new ServerComponentArray<DecorationComponent>(ServerComponentType.decoration, true, {
   padData: padData,
   updateFromData: updateFromData
});
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const decorationComponent = DecorationComponentArray.getComponent(entity);
   decorationComponent.decorationType = reader.readNumber();
}