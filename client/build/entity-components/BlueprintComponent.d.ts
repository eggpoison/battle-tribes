import { BlueprintComponentData, BlueprintType, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import RenderPart from "../render-parts/RenderPart";
import Entity from "../Entity";
declare class BlueprintComponent extends ServerComponent<ServerComponentType.blueprint> {
    readonly partialRenderParts: RenderPart[];
    readonly blueprintType: BlueprintType;
    lastBlueprintProgress: number;
    readonly associatedEntityID: number;
    constructor(entity: Entity, data: BlueprintComponentData);
    updateFromData(data: BlueprintComponentData): void;
}
export default BlueprintComponent;
