import { BoulderComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { randInt } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";

export class BoulderComponent {
   public readonly boulderType = randInt(0, 1);
}

export const BoulderComponentArray = new ComponentArray<ServerComponentType.boulder, BoulderComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): BoulderComponentData {
   const boulderComponent = BoulderComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.boulder,
      boulderType: boulderComponent.boulderType
   };
}