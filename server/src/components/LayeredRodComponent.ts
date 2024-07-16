import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";
import { LayeredRodComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID } from "webgl-test-shared/dist/entities";

export interface LayeredRodComponentParams {}

export class LayeredRodComponent {
   public readonly numLayers = randInt(2, 5);
   public readonly naturalBend = Point.fromVectorForm(randFloat(2, 4), 2 * Math.PI * Math.random());
   public readonly colour = {
      r: randFloat(0, 0.3),
      g: randFloat(0.8, 0.95),
      b: randFloat(0, 0.2)
   };
}

export const LayeredRodComponentArray = new ComponentArray<LayeredRodComponent>(ServerComponentType.layeredRod, true, {
   serialise: serialise
});

function serialise(entity: EntityID): LayeredRodComponentData {
   const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);
   
   return {
      componentType: ServerComponentType.layeredRod,
      numLayers: layeredRodComponent.numLayers,
      naturalBend: layeredRodComponent.naturalBend.package(),
      colour: layeredRodComponent.colour
   };
}