import ServerComponent from "../ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";

class BoulderComponent extends ServerComponent {
   public boulderType = 0;
}

export default BoulderComponent;

export const BoulderComponentArray = new ServerComponentArray<BoulderComponent>(ServerComponentType.boulder, true, {
   padData: padData,
   updateFromData: updateFromData
});
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const boudlerComponent = BoulderComponentArray.getComponent(entity);
   boudlerComponent.boulderType = reader.readNumber();
}