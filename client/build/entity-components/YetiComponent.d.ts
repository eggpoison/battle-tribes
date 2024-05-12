import { ServerComponentType, YetiComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
declare class YetiComponent extends ServerComponent<ServerComponentType.yeti> {
    pawRenderParts: RenderPart[];
    lastAttackProgress: number;
    attackProgress: number;
    constructor(entity: Entity, data: YetiComponentData);
    updateFromData(data: YetiComponentData): void;
}
export default YetiComponent;
