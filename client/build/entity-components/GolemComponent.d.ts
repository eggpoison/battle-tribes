import { GolemComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class GolemComponent extends ServerComponent<ServerComponentType.golem> {
    private rockRenderParts;
    private readonly eyeRenderParts;
    private readonly eyeLights;
    private wakeProgress;
    constructor(entity: Entity, data: GolemComponentData);
    tick(): void;
    updateFromData(data: GolemComponentData): void;
}
export default GolemComponent;
