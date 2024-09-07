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

export const TRIBESMAN_RESTING_LIMB_STATE: LimbState = {
   direction: Math.PI * 0.4,
   extraOffset: 0,
   rotation: 0
};