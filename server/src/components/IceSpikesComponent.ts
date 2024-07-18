import { randInt } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { ComponentConfig } from "../components";

export interface IceSpikesComponentParams {
   /** Root ice spike. If null, defaults to the ice spike itself. */
   rootIceSpike: EntityID | null;
}

export class IceSpikesComponent {
   public readonly maxChildren = randInt(0, 3);
   public numChildrenIceSpikes = 0;
   public iceSpikeGrowProgressTicks = 0;
   public readonly rootIceSpike: EntityID;

   constructor(params: IceSpikesComponentParams) {
      if (params.rootIceSpike === null) {
         console.warn("Root ice spike was null! Defaulting to 0");
         this.rootIceSpike = 0;
      } else {
         this.rootIceSpike = params.rootIceSpike;
      }
   }
}

export const IceSpikesComponentArray = new ComponentArray<IceSpikesComponent>(ServerComponentType.iceSpikes, true, {
   onInitialise: onInitialise,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onInitialise(config: ComponentConfig<ServerComponentType.iceSpikes>, entity: EntityID): void {
   if (config[ServerComponentType.iceSpikes].rootIceSpike === null) {
      config[ServerComponentType.iceSpikes].rootIceSpike = entity;
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}