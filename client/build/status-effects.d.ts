import { StatusEffect } from "webgl-test-shared/dist/status-effects";
export interface ClientStatusEffectInfo {
    readonly name: string;
    readonly colour: string;
}
export declare const CLIENT_STATUS_EFFECT_INFO_RECORD: Record<StatusEffect, ClientStatusEffectInfo>;
