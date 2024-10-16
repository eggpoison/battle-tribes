import { EntityID, TreeSize } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

class TreeComponent {
   public treeSize = TreeSize.small;
}

export default TreeComponent;

export const TreeComponentArray = new ServerComponentArray<TreeComponent>(ServerComponentType.tree, true, {
   padData: padData,
   updateFromData: updateFromData
});
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const treeComponent = TreeComponentArray.getComponent(entity);
   treeComponent.treeSize = reader.readNumber();
}