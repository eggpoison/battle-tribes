import { CactusComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { CactusBodyFlowerData, CactusLimbData } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";

export interface CactusComponentParams {
   readonly flowers: ReadonlyArray<CactusBodyFlowerData>;
   readonly limbs: ReadonlyArray<CactusLimbData>;
}

export class CactusComponent {
   public readonly flowers: ReadonlyArray<CactusBodyFlowerData>;
   public readonly limbs: ReadonlyArray<CactusLimbData>;

   constructor(params: CactusComponentParams) {
      this.flowers = params.flowers;
      this.limbs = params.limbs;
   }
}

export const CactusComponentArray = new ComponentArray<CactusComponent>(ServerComponentType.cactus, true, {
   serialise: serialise
});

function serialise(entityID: number): CactusComponentData {
   const cactusComponent = CactusComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.cactus,
      flowers: cactusComponent.flowers,
      limbs: cactusComponent.limbs
   };
}