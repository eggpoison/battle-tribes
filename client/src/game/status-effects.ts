import { StatusEffect } from "battletribes-shared/status-effects";

export interface ClientStatusEffectInfo {
   readonly name: string;
   readonly colour: string;
}

export const CLIENT_STATUS_EFFECT_INFO_RECORD: Record<StatusEffect, ClientStatusEffectInfo> = {
   [StatusEffect.burning]: {
      name: "burning",
      colour: "#eb4034"
   },
   [StatusEffect.bleeding]: {
      name: "bleeding",
      colour: "#a60b00"
   },
   [StatusEffect.freezing]: {
      name: "freezing",
      colour: "#738bf5"
   },
   [StatusEffect.poisoned]: {
      name: "poisoned",
      colour: "#16b51b"
   },
   [StatusEffect.heatSickness]: {
      // @TEMPORARY
      name: "poisoned",
      colour: "#16b51b"
   }
}