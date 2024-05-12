export declare const enum StatusEffect {
    burning = 1,
    freezing = 2,
    poisoned = 4,
    bleeding = 8
}
interface StatusEffectModifiers {
    readonly moveSpeedMultiplier: number;
}
export declare const STATUS_EFFECT_MODIFIERS: Record<StatusEffect, StatusEffectModifiers>;
export {};
