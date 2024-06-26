import { BerryBushComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export class BerryBushComponent {
   public numBerries = 0;
   public berryGrowTimer = 0;
}

export const BerryBushComponentArray = new ComponentArray<ServerComponentType.berryBush, BerryBushComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): BerryBushComponentData {
   const berryComponent = BerryBushComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.berryBush,
      numBerries: berryComponent.numBerries
   };
}