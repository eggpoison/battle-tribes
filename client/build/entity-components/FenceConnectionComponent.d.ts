import { FenceConnectionComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class FenceConnectionComponent extends ServerComponent<ServerComponentType.fenceConnection> {
    connectedSidesBitset: number;
    constructor(entity: Entity, data: FenceConnectionComponentData);
    updateFromData(data: FenceConnectionComponentData): void;
}
export default FenceConnectionComponent;
