import { CactusComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class CactusComponent extends ServerComponent<ServerComponentType.cactus> {
    private readonly flowerData;
    private readonly limbData;
    constructor(entity: Entity, data: CactusComponentData);
    updateFromData(_data: CactusComponentData): void;
    onDie(): void;
}
export default CactusComponent;
