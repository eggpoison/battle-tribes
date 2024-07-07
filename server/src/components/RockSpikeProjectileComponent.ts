import { RockSpikeProjectileSize } from "webgl-test-shared/dist/entities";
import { RockSpikeProjectileComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface RockSpikeProjectileComponentParams {
   readonly size: number;
   readonly lifetimeTicks: number;
   readonly frozenYetiID: number;
}

export class RockSpikeProjectileComponent {
   public readonly size: RockSpikeProjectileSize;
   public readonly lifetimeTicks: number;
   public readonly frozenYetiID: number;

   constructor(params: RockSpikeProjectileComponentParams) {
      this.size = params.size;
      this.lifetimeTicks = params.lifetimeTicks;
      this.frozenYetiID = params.frozenYetiID;
   }
}

export const RockSpikeProjectileComponentArray = new ComponentArray<ServerComponentType.rockSpike, RockSpikeProjectileComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): RockSpikeProjectileComponentData {
   const rockSpikeComponent = RockSpikeProjectileComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.rockSpike,
      size: rockSpikeComponent.size,
      lifetime: rockSpikeComponent.lifetimeTicks
   };
}