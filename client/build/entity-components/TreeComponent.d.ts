import { ServerComponentType, TreeComponentData } from "webgl-test-shared/dist/components";
import { TreeSize } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class TreeComponent extends ServerComponent<ServerComponentType.tree> {
    readonly treeSize: TreeSize;
    constructor(entity: Entity, data: TreeComponentData);
    updateFromData(_data: TreeComponentData): void;
}
export default TreeComponent;
