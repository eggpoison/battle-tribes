import { FishComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class FishComponent extends ServerComponent<ServerComponentType.fish> {
    readonly waterOpacityMultiplier: number;
    constructor(entity: Entity, waterOpacityMultiplier: number);
    updateFromData(_data: FishComponentData): void;
}
export default FishComponent;
