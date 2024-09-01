import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { randFloat } from "webgl-test-shared/dist/utils";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import { getAgeTicks, TransformComponentArray } from "./TransformComponent";

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
   const transformComponent = TransformComponentArray.getComponent(iceShard);
   const ageTicks = getAgeTicks(transformComponent);
   
   // @Cleanup @Speed: Don't even need a component for this, just do it based on age with a random chance
   if (ageTicks / Settings.TPS >= iceShardComponent.lifetime) {
      Board.destroyEntity(iceShard);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}