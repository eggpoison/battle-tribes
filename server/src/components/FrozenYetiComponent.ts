import { Point } from "webgl-test-shared/dist/utils";
import { FrozenYetiAttackType } from "webgl-test-shared/dist/entities";
import { FrozenYetiComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { FROZEN_YETI_STOMP_COOLDOWN, FrozenYetiRockSpikeInfo, FrozenYetiTargetInfo } from "../entities/mobs/frozen-yeti";
import { ComponentArray } from "./ComponentArray";

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

export const FrozenYetiComponentArray = new ComponentArray<ServerComponentType.frozenYeti, FrozenYetiComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): FrozenYetiComponentData {
   const frozenYetiComponent = FrozenYetiComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.frozenYeti,
      attackType: frozenYetiComponent.attackType,
      attackStage: frozenYetiComponent.attackStage,
      stageProgress: frozenYetiComponent.stageProgress,
      rockSpikePositions: frozenYetiComponent.rockSpikeInfoArray.map(info => [info.positionX, info.positionY])
   };
}