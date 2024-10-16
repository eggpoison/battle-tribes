import { TreeSize } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface TreeComponent {
   readonly treeSize: TreeSize;
}

export function createTreeComponent(treeSize: TreeSize): TreeComponent {
   return {
      treeSize: treeSize
   };
}

export function createTreeComponentFromData(reader: PacketReader): TreeComponent {
   const treeSize = reader.readNumber();
   return createTreeComponent(treeSize);
}

export default TreeComponent;

export const TreeComponentArray = new ServerComponentArray<TreeComponent>(ServerComponentType.tree, true, {
   padData: padData,
   updateFromData: updateFromData
});
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}