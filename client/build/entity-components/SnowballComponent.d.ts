import { ServerComponentType, SnowballComponentData } from "webgl-test-shared/dist/components";
import { SnowballSize } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class SnowballComponent extends ServerComponent<ServerComponentType.snowball> {
    readonly size: SnowballSize;
    constructor(entity: Entity, data: SnowballComponentData);
    updateFromData(_data: SnowballComponentData): void;
}
export default SnowballComponent;
