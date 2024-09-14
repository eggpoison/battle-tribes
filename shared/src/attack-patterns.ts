import { Settings } from "./settings";

export const enum AttackVars {
   MAX_EXTRA_ATTACK_RANGE = 20,
   // The speed needed to have the max attack range
   MAX_EXTRA_ATTACK_RANGE_SPEED = 300
}

export interface LimbState {
   /** Limb direction */
   direction: number;
   /** Extra offset out from the entity's resting limb offset */
   extraOffset: number;
   rotation: number;
   extraOffsetX: number;
   extraOffsetY: number;
}

export interface AttackPatternInfo {
   readonly windedBack: LimbState;
   readonly swung: LimbState;
}

export interface AttackTimingsInfo {
   readonly windupTimeTicks: number;
   readonly swingTimeTicks: number;
   readonly returnTimeTicks: number;
   readonly restTimeTicks: number;
   /** If null, then the attack cannot block. */
   readonly blockTimeTicks: number | null;
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
      rotation: Math.PI * 1/3,
      extraOffsetX: 0,
      extraOffsetY: 0
   },
   swung: {
      direction: 0,
      extraOffset: 16,
      rotation: Math.PI * -2/3,
      extraOffsetX: 0,
      extraOffsetY: 0
   }
};

export const SPEAR_ATTACK_PATTERN: AttackPatternInfo = {
   windedBack: {
      direction: Math.PI * 0.6,
      extraOffset: 0,
      rotation: 0,
      extraOffsetX: 0,
      extraOffsetY: 0
   },
   swung: {
      direction: Math.PI * 0.2,
      extraOffset: 7,
      rotation: Math.PI * -1/7,
      extraOffsetX: 0,
      extraOffsetY: 0
   }
};

/* -------------- */
/* ATTACK TIMINGS */
/* -------------- */

export const DEFAULT_ATTACK_TIMINGS: AttackTimingsInfo = {
   windupTimeTicks: Math.floor(0.1 * Settings.TPS),
   swingTimeTicks: Math.floor(0.15 * Settings.TPS),
   returnTimeTicks: Math.floor(0.2 * Settings.TPS),
   restTimeTicks: Math.floor(0.2 * Settings.TPS),
   blockTimeTicks: null
};

export const AXE_ATTACK_TIMINGS: AttackTimingsInfo = {
   windupTimeTicks: Math.floor(0.15 * Settings.TPS),
   swingTimeTicks: Math.floor(0.2 * Settings.TPS),
   returnTimeTicks: Math.floor(0.3 * Settings.TPS),
   restTimeTicks: Math.floor(0.3 * Settings.TPS),
   blockTimeTicks: Math.floor(0.3 * Settings.TPS)
};

export const PICKAXE_ATTACK_TIMINGS: AttackTimingsInfo = {
   windupTimeTicks: Math.floor(0.2 * Settings.TPS),
   swingTimeTicks: Math.floor(0.25 * Settings.TPS),
   returnTimeTicks: Math.floor(0.35 * Settings.TPS),
   restTimeTicks: Math.floor(0.35 * Settings.TPS),
   blockTimeTicks: Math.floor(0.3 * Settings.TPS)
};

export const SWORD_ATTACK_TIMINGS: AttackTimingsInfo = {
   windupTimeTicks: Math.floor(0.1 * Settings.TPS),
   swingTimeTicks: Math.floor(0.2 * Settings.TPS),
   returnTimeTicks: Math.floor(0.15 * Settings.TPS),
   restTimeTicks: Math.floor(0.15 * Settings.TPS),
   blockTimeTicks: Math.floor(0.2 * Settings.TPS)
};

export const SPEAR_ATTACK_TIMINGS: AttackTimingsInfo = {
   windupTimeTicks: Math.floor(0.25 * Settings.TPS),
   swingTimeTicks: Math.floor(0.2 * Settings.TPS),
   returnTimeTicks: Math.floor(0.35 * Settings.TPS),
   restTimeTicks: Math.floor(0.35 * Settings.TPS),
   blockTimeTicks: null
};

/* ----------- */
/* LIMB STATES */
/* ----------- */

export const TRIBESMAN_RESTING_LIMB_STATE: LimbState = {
   direction: Math.PI * 0.4,
   extraOffset: 0,
   rotation: 0,
   extraOffsetX: 0,
   extraOffsetY: 0
};

export const SPEAR_CHARGED_LIMB_STATE: LimbState = {
   direction: Math.PI * 0.6,
   extraOffset: 0,
   rotation: Math.PI * 0.3,
   extraOffsetX: 0,
   extraOffsetY: 0
};

export const BLOCKING_LIMB_STATE: LimbState = {
   direction: Math.PI * 0.3,
   extraOffset: 6,
   rotation: Math.PI * -0.65,
   extraOffsetX: 0,
   extraOffsetY: 0
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
   height: 72,
   rotation: Math.PI / 4, // 45 degrees to the right
   offsetX: 28,
   offsetY: 28,
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

export const SPEAR_DAMAGE_BOX_INFO: LimbHeldItemDamageBoxInfo = {
   width: 20,
   height: 88,
   rotation: 0,
   offsetX: 5,
   offsetY: 11,
   showLargeTexture: true
};

export function copyAttackPattern(attackPattern: AttackPatternInfo): AttackPatternInfo {
   return {
      windedBack: {
         direction: attackPattern.windedBack.direction,
         extraOffset: attackPattern.windedBack.extraOffset,
         rotation: attackPattern.windedBack.rotation,
         extraOffsetX: attackPattern.windedBack.extraOffsetX,
         extraOffsetY: attackPattern.windedBack.extraOffsetY
      },
      swung: {
         direction: attackPattern.swung.direction,
         extraOffset: attackPattern.swung.extraOffset,
         rotation: attackPattern.swung.rotation,
         extraOffsetX: attackPattern.swung.extraOffsetX,
         extraOffsetY: attackPattern.swung.extraOffsetY
      }
   };
}