import { PlayerComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class PlayerComponent extends ServerComponent<ServerComponentType.player> {
    readonly username: string;
    constructor(entity: Entity, data: PlayerComponentData);
    updateFromData(_data: PlayerComponentData): void;
}
export default PlayerComponent;
