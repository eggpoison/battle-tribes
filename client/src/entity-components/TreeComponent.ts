import { TreeSize } from "battletribes-shared/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

class TreeComponent extends ServerComponent {
   public readonly treeSize: TreeSize;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.treeSize = reader.readNumber();
   }
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default TreeComponent;

export const TreeComponentArray = new ComponentArray<TreeComponent>(ComponentArrayType.server, ServerComponentType.tree, true, {});