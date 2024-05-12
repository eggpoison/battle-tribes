import { ServerComponentType, StatusEffectComponentData } from "webgl-test-shared/dist/components";
import { StatusEffectData } from "webgl-test-shared/dist/client-server-types";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class StatusEffectComponent extends ServerComponent<ServerComponentType.statusEffect> {
    private burningLight;
    statusEffects: StatusEffectData[];
    constructor(entity: Entity, data: StatusEffectComponentData);
    tick(): void;
    updateFromData(data: StatusEffectComponentData): void;
    hasStatusEffect(type: StatusEffect): boolean;
    getStatusEffect(type: StatusEffect): StatusEffectData | null;
}
export default StatusEffectComponent;
