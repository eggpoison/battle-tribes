import { ServerComponentType } from "webgl-test-shared/dist/components";
import Board from "../Board";
import { BODY_GENERATION_RADIUS, GOLEM_WAKE_TIME_TICKS } from "../entities/mobs/golem";
import { ComponentArray } from "./ComponentArray";
import { Hitbox, CircularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

export interface GolemComponentParams {
   readonly hitboxes: ReadonlyArray<Hitbox>;
   readonly pebblumSummonCooldownTicks: number;
}

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

export interface GolemTargetInfo {
   damageDealtToSelf: number;
   timeSinceLastAggro: number;
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

export class GolemComponent {
   public readonly rockInfoArray: Array<RockInfo>;
   public readonly attackingEntities: Record<number, GolemTargetInfo> = {};
   public wakeTimerTicks = 0;
   public lastWakeTicks = 0;

   public summonedPebblumIDs = new Array<number>();
   public pebblumSummonCooldownTicks: number;
   
   constructor(params: GolemComponentParams) {
      this.rockInfoArray = generateRockInfoArray(params.hitboxes);
      this.pebblumSummonCooldownTicks = params.pebblumSummonCooldownTicks;
   }
}

export const GolemComponentArray = new ComponentArray<GolemComponent>(ServerComponentType.golem, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const golemComponent = GolemComponentArray.getComponent(entity);

   packet.addNumber(golemComponent.wakeTimerTicks / GOLEM_WAKE_TIME_TICKS);
   packet.addNumber(Board.ticks - golemComponent.lastWakeTicks);
   packet.addBoolean(golemComponent.wakeTimerTicks === GOLEM_WAKE_TIME_TICKS);
   packet.padOffset(3);
}