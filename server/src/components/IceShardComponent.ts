import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { randFloat } from "battletribes-shared/utils";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { destroyEntity, getEntityAgeTicks } from "../world";

export interface IceShardComponentParams {}

export class IceShardComponent {
   public readonly lifetime = randFloat(0.1, 0.2);
}

export const IceShardComponentArray = new ComponentArray<IceShardComponent>(ServerComponentType.iceShard, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(iceShardComponent: IceShardComponent, iceShard: EntityID): void {
   const ageTicks = getEntityAgeTicks(iceShard);
   
   // @Cleanup @Speed: Don't even need a component for this, just do it based on age with a random chance
   if (ageTicks / Settings.TPS >= iceShardComponent.lifetime) {
      destroyEntity(iceShard);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}