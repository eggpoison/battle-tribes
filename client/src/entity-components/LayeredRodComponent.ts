import { LayeredRodComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import ColouredRenderPart, { RenderPartColour } from "../render-parts/ColouredRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import ServerComponent from "./ServerComponent";
import { lerp } from "webgl-test-shared/dist/utils";

class LayeredRodComponent extends ServerComponent {
   private readonly renderParts = new Array<RenderPart>();
   
   constructor(entity: Entity, data: LayeredRodComponentData) {
      super(entity);

      const bendX = data.naturalBend[0];
      const bendY = data.naturalBend[1];
      
      // Create layers
      for (let layer = 1; layer <= data.numLayers; layer++) {
         // Lower layers are darker
         // let brightnessMultiplier = layer / data.numLayers;
         let brightnessMultiplier = (layer - 1) / Math.max((data.numLayers - 1), 1);

         // Minimum brighness
         brightnessMultiplier = lerp(brightnessMultiplier, 1, 0.35);
         
         const colour: RenderPartColour = {
            r: data.colour.r * brightnessMultiplier,
            g: data.colour.g * brightnessMultiplier,
            b: data.colour.b * brightnessMultiplier,
            a: 1
         };
         
         const zIndex = layer / 10;
         const renderPart = new ColouredRenderPart(
            entity,
            zIndex,
            0,
            colour
         );

         renderPart.offset.x = bendX * layer;
         renderPart.offset.y = bendY * layer;

         this.renderParts.push(renderPart);
         this.entity.attachRenderPart(renderPart);
      }
   }

   public updateFromData(): void {}
}

export default LayeredRodComponent;