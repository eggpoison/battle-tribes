import { YetiComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import Tile from "../Tile";
import { SnowThrowStage, YETI_SNOW_THROW_COOLDOWN } from "../entities/mobs/yeti";
import { YetiComponentArray } from "./ComponentArray";

export interface YetiTargetInfo {
   remainingPursueTicks: number;
   totalDamageDealt: number;
}

export class YetiComponent {
   public readonly territory: ReadonlyArray<Tile>;

   // Stores the ids of all entities which have recently attacked the yeti
   public readonly attackingEntities: Partial<Record<number, YetiTargetInfo>> = {};

   public attackTarget: Entity | null = null;
   public isThrowingSnow = false;
   public snowThrowStage: SnowThrowStage = SnowThrowStage.windup;
   public snowThrowAttackProgress = 1;
   public snowThrowCooldown = YETI_SNOW_THROW_COOLDOWN;
   public snowThrowHoldTimer = 0;

   constructor(territory: ReadonlyArray<Tile>) {
      this.territory = territory;
   }
}

export function serialiseYetiComponent(yeti: Entity): YetiComponentData {
   const yetiComponent = YetiComponentArray.getComponent(yeti.id);
   return {
      attackProgress: yetiComponent.snowThrowAttackProgress
   };
}