import { BerryBushComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
declare class BerryBushComponent extends ServerComponent<ServerComponentType.berryBush> {
    private readonly renderPart;
    constructor(entity: Entity, data: BerryBushComponentData, renderPart: RenderPart);
    updateFromData(data: BerryBushComponentData): void;
}
export default BerryBushComponent;
