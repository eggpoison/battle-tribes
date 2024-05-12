import { TribeType } from "webgl-test-shared/dist/tribes";
import { ServerComponentType, TribeComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
declare class TribeComponent extends ServerComponent<ServerComponentType.tribe> {
    tribeID: number;
    tribeType: TribeType;
    constructor(entity: Entity, data: TribeComponentData);
    updateFromData(data: TribeComponentData): void;
}
export default TribeComponent;
