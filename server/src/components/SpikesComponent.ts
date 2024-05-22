import { SpikesComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { SpikesComponentArray } from "./ComponentArray";

export class SpikesComponent {
   public isCovered = false;
}

export function serialiseSpikesComponent(spikes: Entity): SpikesComponentData {
   const spikesComponent = SpikesComponentArray.getComponent(spikes.id);
   return {
      isCovered: spikesComponent.isCovered
   };
}