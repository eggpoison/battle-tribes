import { BoulderComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { randInt } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";

export interface BoulderComponentParams {}

export class BoulderComponent {
   public readonly boulderType = randInt(0, 1);
}

export const BoulderComponentArray = new ComponentArray<BoulderComponent>(ServerComponentType.boulder, true, {
   serialise: serialise
});

function serialise(entityID: EntityID): BoulderComponentData {
   const boulderComponent = BoulderComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.boulder,
      boulderType: boulderComponent.boulderType
   };
}