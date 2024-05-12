import { ServerComponentType, SpikesComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
export declare const NUM_SMALL_COVER_LEAVES = 8;
export declare const NUM_LARGE_COVER_LEAVES = 3;
declare class SpikesComponent extends ServerComponent<ServerComponentType.spikes> {
    private readonly renderPart;
    private readonly leafRenderParts;
    isCovered: boolean;
    readonly attachedWallID: number;
    constructor(entity: Entity, data: SpikesComponentData, renderPart: RenderPart);
    private createLeafRenderPart;
    onLoad(): void;
    private updateLeafRenderParts;
    private updateRenderPart;
    updateFromData(data: SpikesComponentData): void;
}
export default SpikesComponent;
