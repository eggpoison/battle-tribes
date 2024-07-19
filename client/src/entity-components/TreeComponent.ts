import { TreeSize } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";

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