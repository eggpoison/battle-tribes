import { PlanterBoxComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class PlanterBoxComponent extends ServerComponent<ServerComponentType.planterBox> {
    private fertiliserRenderPart;
    hasPlant: boolean;
    constructor(entity: Entity, data: PlanterBoxComponentData);
    private updateFertiliserRenderPart;
    updateFromData(data: PlanterBoxComponentData): void;
}
export default PlanterBoxComponent;
