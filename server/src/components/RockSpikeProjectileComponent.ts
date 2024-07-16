import { RockSpikeProjectileSize } from "webgl-test-shared/dist/entities";
import { RockSpikeProjectileComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { ComponentConfig } from "../components";
import { CircularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

export interface RockSpikeProjectileComponentParams {
   size: number;
   readonly lifetimeTicks: number;
   frozenYetiID: number;
}

// @Cleanup: why do we have to export these?
export const ROCK_SPIKE_HITBOX_SIZES = [12 * 2, 16 * 2, 20 * 2];
export const ROCK_SPIKE_MASSES = [1, 1.75, 2.5];

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

export const RockSpikeProjectileComponentArray = new ComponentArray<RockSpikeProjectileComponent>(ServerComponentType.rockSpike, true, {
   onInitialise: onInitialise,
   serialise: serialise
});

function onInitialise(config: ComponentConfig<ServerComponentType.transform | ServerComponentType.rockSpike>): void {
   const size = config[ServerComponentType.rockSpike].size;

   const hitbox = config[ServerComponentType.transform].hitboxes[0] as CircularHitbox;
   hitbox.mass = ROCK_SPIKE_MASSES[size];
   hitbox.radius = ROCK_SPIKE_HITBOX_SIZES[size];
}

function serialise(entityID: number): RockSpikeProjectileComponentData {
   const rockSpikeComponent = RockSpikeProjectileComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.rockSpike,
      size: rockSpikeComponent.size,
      lifetime: rockSpikeComponent.lifetimeTicks
   };
}