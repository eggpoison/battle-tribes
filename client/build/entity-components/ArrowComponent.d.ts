import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { ArrowComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { GenericArrowType } from "webgl-test-shared/dist/entities";
declare class ArrowComponent extends ServerComponent<ServerComponentType.arrow> {
    readonly arrowType: GenericArrowType;
    constructor(entity: Entity, data: ArrowComponentData);
    updateFromData(_data: ArrowComponentData): void;
}
export default ArrowComponent;
