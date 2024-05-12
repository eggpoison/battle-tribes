import { ServerComponentType, ZombieComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
declare class ZombieComponent extends ServerComponent<ServerComponentType.zombie> {
    readonly zombieType: number;
    constructor(entity: Entity, data: ZombieComponentData);
    updateFromData(_data: ZombieComponentData): void;
}
export default ZombieComponent;
