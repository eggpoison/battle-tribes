import { ServerComponentType, TreeComponentData } from "webgl-test-shared/dist/components";
import { TreeSize } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class TreeComponent extends ServerComponent<ServerComponentType.tree> {
   public readonly treeSize: TreeSize;
   
   constructor(entity: Entity, data: TreeComponentData) {
      super(entity);

      this.treeSize = data.treeSize;
   }
   
   public updateFromData(_data: TreeComponentData): void {}
}

export default TreeComponent;