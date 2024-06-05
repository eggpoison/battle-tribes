import { CactusComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { CactusBodyFlowerData, CactusLimbData } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";

export class CactusComponent {
   public readonly flowers: ReadonlyArray<CactusBodyFlowerData>;
   public readonly limbs: ReadonlyArray<CactusLimbData>;

   constructor(flowers: ReadonlyArray<CactusBodyFlowerData>, limbs: ReadonlyArray<CactusLimbData>) {
      this.flowers = flowers;
      this.limbs = limbs;
   }
}

export const CactusComponentArray = new ComponentArray<ServerComponentType.cactus, CactusComponent>(true, {
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