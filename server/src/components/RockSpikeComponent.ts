import { EntityID, RockSpikeProjectileSize } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityAgeTicks } from "../world";
import { Settings } from "../../../shared/src/settings";
import { randFloat } from "../../../shared/src/utils";

export class RockSpikeComponent {
   public readonly size: RockSpikeProjectileSize;
   public readonly lifetimeTicks = Math.floor(randFloat(3.5, 4.5) * Settings.TPS);
   public readonly frozenYeti: EntityID;

   constructor(size: number, frozenYeti: EntityID) {
      this.size = size;
      this.frozenYeti = frozenYeti;
   }
}

export const RockSpikeComponentArray = new ComponentArray<RockSpikeComponent>(ServerComponentType.rockSpike, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(rockSpikeComponent: RockSpikeComponent, rockSpike: EntityID): void {
   const ageTicks = getEntityAgeTicks(rockSpike);
   
   // Remove if past lifetime
   if (ageTicks >= rockSpikeComponent.lifetimeTicks) {
      destroyEntity(rockSpike);
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