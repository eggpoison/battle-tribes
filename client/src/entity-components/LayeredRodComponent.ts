import { LayeredRodComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import ColouredRenderPart, { RenderPartColour } from "../render-parts/ColouredRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import ServerComponent from "./ServerComponent";
import { lerp } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import { hueShift } from "../colour";

class LayeredRodComponent extends ServerComponent {
   private readonly renderParts = new Array<RenderPart>();

   private readonly numLayers: number;
   
   private bendX: number;
   private bendY: number;
   
   constructor(entity: Entity, data: LayeredRodComponentData) {
      super(entity);

      this.numLayers = data.numLayers;
      this.bendX = data.bend[0];
      this.bendY = data.bend[1];
      
      const transformComponent = entity.getServerComponent(ServerComponentType.transform);

      const tileX = Math.floor(transformComponent.position.x / Settings.TILE_SIZE);
      const tileY = Math.floor(transformComponent.position.y / Settings.TILE_SIZE);

      const grassInfo = Board.grassInfo[tileX][tileY];

      let humidity = grassInfo.humidity;
      if (grassInfo.temperature <= 0.5) {
         humidity = lerp(humidity, 0, 1 - grassInfo.temperature * 2);
      }
      
      const bendX = data.bend[0];
      const bendY = data.bend[1];
      
      // Create layers
      for (let layer = 1; layer <= data.numLayers; layer++) {
         // Lower layers are darker
         // let brightnessMultiplier = layer / data.numLayers;
         let brightnessMultiplier = (layer - 1) / Math.max((data.numLayers - 1), 1);

         // Minimum brighness
         brightnessMultiplier = lerp(brightnessMultiplier, 1, 0.8);
         
         const colour: RenderPartColour = {
            r: data.colour.r * brightnessMultiplier,
            g: data.colour.g * brightnessMultiplier,
            b: data.colour.b * brightnessMultiplier,
            a: 1
         };

         if (grassInfo.temperature > 0) {
            const humidityMultiplier = (humidity - 0.5) * -0.7;
            if (humidityMultiplier > 0) {
               colour.r = lerp(colour.r, 1, humidityMultiplier * 0.7);
               colour.b = lerp(colour.b, 1, humidityMultiplier * 0.7);
            } else {
               colour.r = lerp(colour.r, 0, -humidityMultiplier);
               colour.b = lerp(colour.b, 0, -humidityMultiplier);
            }
   
            const hueAdjust = (grassInfo.temperature - 0.5) * 0.8;
            hueShift(colour, hueAdjust);
         }
         
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

   private updateOffsets(bendX: number, bendY: number): void {
      for (let layer = 1; layer <= this.numLayers; layer++) {
         const renderPart = this.renderParts[layer - 1];

         renderPart.offset.x = bendX * layer;
         renderPart.offset.y = bendY * layer;
      }
   }

   public updateFromData(data: LayeredRodComponentData): void {
      if (data.bend[0] !== this.bendX || data.bend[1] !== this.bendY) {
         this.bendX = data.bend[0];
         this.bendY = data.bend[1];

         this.updateOffsets(data.bend[0], data.bend[1]);

         this.entity.dirty();
      }
   }
}

export default LayeredRodComponent;