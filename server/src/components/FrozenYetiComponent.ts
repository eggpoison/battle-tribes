import { Point } from "webgl-test-shared/dist/utils";
import { EntityID, FrozenYetiAttackType } from "webgl-test-shared/dist/entities";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { FROZEN_YETI_STOMP_COOLDOWN, FrozenYetiRockSpikeInfo, FrozenYetiTargetInfo } from "../entities/mobs/frozen-yeti";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "webgl-test-shared/dist/packets";

export interface FrozenYetiComponentParams {}

export class FrozenYetiComponent {
   public readonly attackingEntities: Partial<Record<number, FrozenYetiTargetInfo>> = {};

   public attackType = FrozenYetiAttackType.none;
   public attackStage = 0;
   public stageProgress = 0;

   public globalAttackCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;
   public snowballThrowCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;
   public roarCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;
   public biteCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;
   public stompCooldownTimer = FROZEN_YETI_STOMP_COOLDOWN;

   public lastTargetPosition: Point | null = null;

   public targetPosition: Point | null = null;

   public rockSpikeInfoArray = new Array<FrozenYetiRockSpikeInfo>();
}

export const FrozenYetiComponentArray = new ComponentArray<FrozenYetiComponent>(ServerComponentType.frozenYeti, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(entity: EntityID): number {
   const frozenYetiComponent = FrozenYetiComponentArray.getComponent(entity);

   let lengthBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 *Float32Array.BYTES_PER_ELEMENT * frozenYetiComponent.rockSpikeInfoArray.length;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const frozenYetiComponent = FrozenYetiComponentArray.getComponent(entity);

   packet.addNumber(frozenYetiComponent.attackType);
   packet.addNumber(frozenYetiComponent.attackStage);
   packet.addNumber(frozenYetiComponent.stageProgress);

   packet.addNumber(frozenYetiComponent.rockSpikeInfoArray.length);
   for (let i = 0; i < frozenYetiComponent.rockSpikeInfoArray.length; i++) {
      const rockSpikeInfo = frozenYetiComponent.rockSpikeInfoArray[i];
      packet.addNumber(rockSpikeInfo.positionX);
      packet.addNumber(rockSpikeInfo.positionY);
   }
}