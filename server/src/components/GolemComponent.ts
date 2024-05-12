import { BODY_GENERATION_RADIUS } from "../entities/mobs/golem";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Hitbox from "../hitboxes/Hitbox";

export interface RockInfo {
   /** The hitbox corresponding to the rock info */
   readonly hitbox: Hitbox;
   readonly sleepOffsetX: number;
   readonly sleepOffsetY: number;
   readonly awakeOffsetX: number;
   readonly awakeOffsetY: number;
   lastOffsetX: number;
   lastOffsetY: number;
   targetOffsetX: number;
   targetOffsetY: number;
   currentShiftTimerTicks: number;
}

const generateRockInfoArray = (hitboxes: ReadonlyArray<Hitbox>): Array<RockInfo> => {
   const rockInfoArray = new Array<RockInfo>();
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i] as CircularHitbox;

      const offsetMagnitude = BODY_GENERATION_RADIUS * Math.random()
      const offsetDirection = 2 * Math.PI * Math.random();

      rockInfoArray.push({
         hitbox: hitbox,
         sleepOffsetX: offsetMagnitude * Math.sin(offsetDirection),
         sleepOffsetY: offsetMagnitude * Math.cos(offsetDirection),
         awakeOffsetX: hitbox.offsetX,
         awakeOffsetY: hitbox.offsetY,
         lastOffsetX: hitbox.offsetX,
         lastOffsetY: hitbox.offsetY,
         targetOffsetX: hitbox.offsetX,
         targetOffsetY: hitbox.offsetY,
         currentShiftTimerTicks: 0
      });
   }
   
   return rockInfoArray;
}

export interface GolemTargetInfo {
   damageDealtToSelf: number;
   timeSinceLastAggro: number;
}

export class GolemComponent {
   public readonly rockInfoArray: Array<RockInfo>;
   public readonly attackingEntities: Record<number, GolemTargetInfo> = {};
   public wakeTimerTicks = 0;

   public summonedPebblumIDs = new Array<number>();
   public pebblumSummonCooldownTicks: number;
   
   constructor(hitboxes: ReadonlyArray<Hitbox>, pebblumSummonCooldownTicks: number) {
      this.rockInfoArray = generateRockInfoArray(hitboxes);
      this.pebblumSummonCooldownTicks = pebblumSummonCooldownTicks;
   }
}