import { FenceGateComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
interface DoorInfo {
    readonly offsetX: number;
    readonly offsetY: number;
    readonly rotation: number;
}
export declare function getFenceGateDoorInfo(openProgress: number): DoorInfo;
declare class FenceGateComponent extends ServerComponent<ServerComponentType.fenceGate> {
    private readonly doorRenderPart;
    openProgress: number;
    constructor(entity: Entity, data: FenceGateComponentData, doorRenderPart: RenderPart);
    private updateDoor;
    updateFromData(data: FenceGateComponentData): void;
}
export default FenceGateComponent;
