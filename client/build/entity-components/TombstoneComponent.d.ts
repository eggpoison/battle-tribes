import { ServerComponentType, TombstoneComponentData } from "webgl-test-shared/dist/components";
import { DeathInfo } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class TombstoneComponent extends ServerComponent<ServerComponentType.tombstone> {
    private zombieSpawnProgress;
    private zombieSpawnX;
    private zombieSpawnY;
    readonly deathInfo: DeathInfo | null;
    constructor(entity: Entity, data: TombstoneComponentData);
    tick(): void;
    updateFromData(data: TombstoneComponentData): void;
}
export default TombstoneComponent;
