import { GolemComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import Board from "../Board";
import { BODY_GENERATION_RADIUS, GOLEM_WAKE_TIME_TICKS } from "../entities/mobs/golem";
import { ComponentArray } from "./ComponentArray";
import { Hitbox, CircularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

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
         awakeOffsetX: hitbox.offset.x,
         awakeOffsetY: hitbox.offset.y,
         lastOffsetX: hitbox.offset.x,
         lastOffsetY: hitbox.offset.y,
         targetOffsetX: hitbox.offset.x,
         targetOffsetY: hitbox.offset.y,
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
   public lastWakeTicks = 0;

   public summonedPebblumIDs = new Array<number>();
   public pebblumSummonCooldownTicks: number;
   
   constructor(hitboxes: ReadonlyArray<Hitbox>, pebblumSummonCooldownTicks: number) {
      this.rockInfoArray = generateRockInfoArray(hitboxes);
      this.pebblumSummonCooldownTicks = pebblumSummonCooldownTicks;
   }
}

export const GolemComponentArray = new ComponentArray<ServerComponentType.golem, GolemComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): GolemComponentData {
   const golemComponent = GolemComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.golem,
      wakeProgress: golemComponent.wakeTimerTicks / GOLEM_WAKE_TIME_TICKS,
      ticksAwake: Board.ticks - golemComponent.lastWakeTicks,
      isAwake: golemComponent.wakeTimerTicks === GOLEM_WAKE_TIME_TICKS
   };
}