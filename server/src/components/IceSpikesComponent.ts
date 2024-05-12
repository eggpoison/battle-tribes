import { randInt } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";

export class IceSpikesComponent {
   public readonly maxChildren = randInt(0, 3);
   public numChildrenIceSpikes = 0;
   public iceSpikeGrowProgressTicks = 0;
   public readonly rootIceSpike: Entity;

   constructor(rootIceSpike: Entity) {
      this.rootIceSpike = rootIceSpike;
   }
}