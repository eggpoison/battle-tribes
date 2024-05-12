import { ServerComponentType, TunnelComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
export interface TunnelDoorInfo {
    readonly offsetX: number;
    readonly offsetY: number;
    readonly rotation: number;
}
export declare function getTunnelDoorInfo(doorBit: number, openProgress: number): TunnelDoorInfo;
declare class TunnelComponent extends ServerComponent<ServerComponentType.tunnel> {
    private readonly doorRenderParts;
    doorBitset: number;
    topDoorOpenProgress: number;
    bottomDoorOpenProgress: number;
    constructor(entity: Entity, data: TunnelComponentData);
    private addDoor;
    private updateDoor;
    updateFromData(data: TunnelComponentData): void;
    hasTopDoor(): boolean;
    hasBottomDoor(): boolean;
}
export default TunnelComponent;
