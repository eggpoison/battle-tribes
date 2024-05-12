import { CookingComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class CookingComponent extends ServerComponent<ServerComponentType.cooking> {
    heatingProgress: number;
    isCooking: boolean;
    private readonly light;
    constructor(entity: Entity, data: CookingComponentData);
    tick(): void;
    updateFromData(data: CookingComponentData): void;
}
export default CookingComponent;
