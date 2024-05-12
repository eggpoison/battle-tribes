import { RockSpikeProjectileSize } from "webgl-test-shared/dist/entities";
import { RockSpikeProjectileComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { RockSpikeProjectileComponentArray } from "./ComponentArray";

export class RockSpikeProjectileComponent {
   public readonly size: RockSpikeProjectileSize;
   public readonly lifetimeTicks: number;
   public readonly frozenYetiID: number;

   constructor(size: number, lifetimeTicks: number, frozenYetiID: number) {
      this.size = size;
      this.lifetimeTicks = lifetimeTicks;
      this.frozenYetiID = frozenYetiID;
   }
}

export function serialiseRockSpikeComponent(rockSpike: Entity): RockSpikeProjectileComponentData {
   const rockSpikeComponent = RockSpikeProjectileComponentArray.getComponent(rockSpike.id);
   return {
      size: rockSpikeComponent.size,
      lifetime: rockSpikeComponent.lifetimeTicks
   };
}