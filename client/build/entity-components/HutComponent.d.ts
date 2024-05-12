import { HutComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
declare class HutComponent extends ServerComponent<ServerComponentType.hut> {
    private readonly doorRenderParts;
    /** Amount the door should swing outwards from 0 to 1 */
    private doorSwingAmount;
    isRecalling: boolean;
    private recallMarker;
    constructor(entity: Entity, data: HutComponentData, doorRenderParts: ReadonlyArray<RenderPart>);
    private updateDoors;
    updateFromData(data: HutComponentData): void;
}
export default HutComponent;
