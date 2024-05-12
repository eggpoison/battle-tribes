import { RockSpikeProjectileComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class RockSpikeComponent extends ServerComponent<ServerComponentType.rockSpike> {
    readonly size: number;
    readonly lifetime: number;
    constructor(entity: Entity, data: RockSpikeProjectileComponentData);
    updateFromData(_data: RockSpikeProjectileComponentData): void;
}
export default RockSpikeComponent;
