import { DoorComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { DoorToggleType } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class DoorComponent extends ServerComponent<ServerComponentType.door> {
    toggleType: DoorToggleType;
    openProgress: number;
    constructor(entity: Entity, data: DoorComponentData);
    updateFromData(data: DoorComponentData): void;
}
export default DoorComponent;
