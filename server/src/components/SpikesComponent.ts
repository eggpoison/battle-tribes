import { ServerComponentType, SpikesComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface SpikesComponentParams {}

export class SpikesComponent {
   public isCovered = false;
}

export const SpikesComponentArray = new ComponentArray<SpikesComponent>(ServerComponentType.spikes, true, {
   serialise: serialise
});

function serialise(entityID: number): SpikesComponentData {
   const spikesComponent = SpikesComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.spikes,
      isCovered: spikesComponent.isCovered
   };
}