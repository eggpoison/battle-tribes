import { PhysicsComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class PhysicsComponent extends ServerComponent<ServerComponentType.physics> {
    constructor(entity: Entity, _data: PhysicsComponentData);
    updateFromData(_data: PhysicsComponentData): void;
}
export default PhysicsComponent;
