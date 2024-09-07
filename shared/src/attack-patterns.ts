import { Settings } from "./settings";

export interface LimbState {
   /** Limb direction */
   readonly direction: number;
   /** Extra offset out from the entity's resting limb offset */
   readonly extraOffset: number;
   readonly rotation: number;
}

export interface AttackPatternInfo {
   readonly windedBack: LimbState;
   readonly swung: LimbState;
}

export interface AttackTimingsInfo {
   readonly windupTimeTicks: number;
   readonly swingTimeTicks: number;
   readonly returnTimeTicks: number;
}

// @Cleanup: rename. not just damage box
export interface LimbHeldItemDamageBoxInfo {
   readonly width: number;
   readonly height: number;
   readonly rotation: number;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly showLargeTexture: boolean;
}

/* --------------- */
/* ATTACK PATTERNS */
/* --------------- */

export const DEFAULT_ATTACK_PATTERN: AttackPatternInfo = {
   windedBack: {
      direction: Math.PI * 0.6,
      extraOffset: 0,
      rotation: Math.PI * 1/3
   },
   swung: {
      direction: 0,
      extraOffset: 16,
      rotation: Math.PI * -2/3
   }
};

/* -------------- */
/* ATTACK TIMINGS */
/* -------------- */

export const DEFAULT_ATTACK_TIMINGS: AttackTimingsInfo = {
   windupTimeTicks: Math.floor(0.1 * Settings.TPS),
   swingTimeTicks: Math.floor(0.15 * Settings.TPS),
   returnTimeTicks: Math.floor(0.2 * Settings.TPS)
}

export const SWORD_ATTACK_TIMINGS: AttackTimingsInfo = {
   windupTimeTicks: Math.floor(0.1 * Settings.TPS),
   swingTimeTicks: Math.floor(0.2 * Settings.TPS),
   returnTimeTicks: Math.floor(0.15 * Settings.TPS)
}

export const TRIBESMAN_RESTING_LIMB_STATE: LimbState = {
   direction: Math.PI * 0.4,
   extraOffset: 0,
   rotation: 0
};

export const DEFAULT_ITEM_DAMAGE_BOX_INFO: LimbHeldItemDamageBoxInfo = {
   width: 20,
   height: 20,
   rotation: 0,
   offsetX: 8,
   offsetY: 8,
   showLargeTexture: false
};

export const SWORD_ITEM_DAMAGE_BOX_INFO: LimbHeldItemDamageBoxInfo = {
   width: 20,
   height: 64,
   rotation: Math.PI / 4, // 45 degrees to the right
   offsetX: 24,
   offsetY: 24,
   showLargeTexture: true
};

export const TOOL_ITEM_DAMAGE_BOX_INFO: LimbHeldItemDamageBoxInfo = {
   width: 30,
   height: 48,
   rotation: Math.PI / 4, // 45 degrees to the right
   offsetX: 20,
   offsetY: 20,
   showLargeTexture: true
};