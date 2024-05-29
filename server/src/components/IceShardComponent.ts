import { IceShardComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { randFloat } from "webgl-test-shared/dist/utils";

export class IceShardComponent {
   public readonly lifetime = randFloat(0.1, 0.2);
}

export const IceShardComponentArray = new ComponentArray<ServerComponentType.iceShard, IceShardComponent>(true, {
   serialise: serialise
});

function serialise(): IceShardComponentData {
   return {
      componentType: ServerComponentType.iceShard
   };
}