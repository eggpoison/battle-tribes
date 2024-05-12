"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_EFFECT_MODIFIERS = void 0;
exports.STATUS_EFFECT_MODIFIERS = {
    [1 /* StatusEffect.burning */]: {
        moveSpeedMultiplier: 1
    },
    [2 /* StatusEffect.freezing */]: {
        moveSpeedMultiplier: 0.5
    },
    [4 /* StatusEffect.poisoned */]: {
        moveSpeedMultiplier: 0.75
    },
    [8 /* StatusEffect.bleeding */]: {
        moveSpeedMultiplier: 1
    }
};
