import { HealingTotemComponentData, HealingTotemTargetData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class HealingTotemComponent extends ServerComponent<ServerComponentType.healingTotem> {
    healingTargetsData: ReadonlyArray<HealingTotemTargetData>;
    private ticksSpentHealing;
    private eyeLights;
    constructor(entity: Entity, data: HealingTotemComponentData);
    tick(): void;
    updateFromData(data: HealingTotemComponentData): void;
}
export default HealingTotemComponent;
