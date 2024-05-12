import { FenceComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class FenceComponent extends ServerComponent<ServerComponentType.fence> {
    private readonly railRenderParts;
    private connectedSidesBitset;
    constructor(entity: Entity, _data: FenceComponentData);
    private addRail;
    private removeRail;
    private checkBit;
    private updateRails;
    updateFromData(_data: FenceComponentData): void;
}
export default FenceComponent;
