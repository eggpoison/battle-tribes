import { randInt } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { IceSpikesComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export class IceSpikesComponent {
   public readonly maxChildren = randInt(0, 3);
   public numChildrenIceSpikes = 0;
   public iceSpikeGrowProgressTicks = 0;
   public readonly rootIceSpike: Entity;

   constructor(rootIceSpike: Entity) {
      this.rootIceSpike = rootIceSpike;
   }
}

export const IceSpikesComponentArray = new ComponentArray<ServerComponentType.iceSpikes, IceSpikesComponent>(true, {
   serialise: serialise
});

function serialise(): IceSpikesComponentData {
   return {
      componentType: ServerComponentType.iceSpikes
   };
}