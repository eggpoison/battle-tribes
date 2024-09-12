import { EntityID, RockSpikeProjectileSize } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { ComponentConfig } from "../components";
import { Packet } from "battletribes-shared/packets";
import { getAgeTicks, TransformComponentArray } from "./TransformComponent";
import Board from "../Board";
import CircularBox from "battletribes-shared/boxes/CircularBox";

export interface RockSpikeProjectileComponentParams {
   size: number;
   readonly lifetimeTicks: number;
   frozenYetiID: number;
}

// @Cleanup: why do we have to export these?
export const ROCK_SPIKE_HITBOX_SIZES = [12 * 2, 16 * 2, 20 * 2];
export const ROCK_SPIKE_MASSES = [1, 1.75, 2.5];

export class RockSpikeComponent {
   public readonly size: RockSpikeProjectileSize;
   public readonly lifetimeTicks: number;
   public readonly frozenYeti: EntityID;

   constructor(params: RockSpikeProjectileComponentParams) {
      this.size = params.size;
      this.lifetimeTicks = params.lifetimeTicks;
      this.frozenYeti = params.frozenYetiID;
   }
}

export const RockSpikeComponentArray = new ComponentArray<RockSpikeComponent>(ServerComponentType.rockSpike, true, {
   onInitialise: onInitialise,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onInitialise(config: ComponentConfig<ServerComponentType.transform | ServerComponentType.rockSpike>): void {
   const size = config[ServerComponentType.rockSpike].size;

   const hitbox = config[ServerComponentType.transform].hitboxes[0];
   const box = hitbox.box as CircularBox;
   
   hitbox.mass = ROCK_SPIKE_MASSES[size];
   box.radius = ROCK_SPIKE_HITBOX_SIZES[size];
}

function onTick(rockSpikeComponent: RockSpikeComponent, rockSpike: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(rockSpike);
   const ageTicks = getAgeTicks(transformComponent);
   
   // Remove if past lifetime
   if (ageTicks >= rockSpikeComponent.lifetimeTicks) {
      Board.destroyEntity(rockSpike);
   }
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const rockSpikeComponent = RockSpikeComponentArray.getComponent(entity);

   packet.addNumber(rockSpikeComponent.size);
   packet.addNumber(rockSpikeComponent.lifetimeTicks);
}