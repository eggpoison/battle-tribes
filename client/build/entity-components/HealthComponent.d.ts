import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { HealthComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
declare class HealthComponent extends ServerComponent<ServerComponentType.health> {
    health: number;
    maxHealth: number;
    secondsSinceLastHit: number;
    constructor(entity: Entity, data: HealthComponentData);
    tick(): void;
    onHit(isDamagingHit: boolean): void;
    updateFromData(data: HealthComponentData): void;
}
export default HealthComponent;
