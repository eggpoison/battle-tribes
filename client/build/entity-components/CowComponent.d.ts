import { CowComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
declare class CowComponent extends ServerComponent<ServerComponentType.cow> {
    private grazeProgress;
    constructor(entity: Entity, data: CowComponentData);
    tick(): void;
    updateFromData(data: CowComponentData): void;
}
export default CowComponent;
