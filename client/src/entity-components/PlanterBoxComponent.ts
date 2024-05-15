import { PlanterBoxComponentData, PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import { randInt } from "webgl-test-shared/dist/utils";

class PlanterBoxComponent extends ServerComponent<ServerComponentType.planterBox> {
   private fertiliserRenderPart: RenderPart | null = null;
   
   public hasPlant: boolean;
   
   constructor(entity: Entity, data: PlanterBoxComponentData) {
      super(entity);

      this.hasPlant = data.plantType !== null;
      this.updateFertiliserRenderPart(data.plantType);
   }

   private updateFertiliserRenderPart(plantType: PlanterBoxPlant | null): void {
      if (plantType !== null) {
         if (this.fertiliserRenderPart === null) {
            // @Temporary
            const textureSource = plantType === PlanterBoxPlant.iceSpikes ? "entities/plant/snow-clump.png" : "entities/plant/dirt-clump.png";
            
            this.fertiliserRenderPart = new RenderPart(
               this.entity,
               getTextureArrayIndex(textureSource),
               1,
               Math.PI / 2 * randInt(0, 3)
            );
            this.entity.attachRenderPart(this.fertiliserRenderPart);
         }
      } else if (this.fertiliserRenderPart !== null) {
         this.entity.removeRenderPart(this.fertiliserRenderPart);
         this.fertiliserRenderPart = null;
      }
   }

   public updateFromData(data: PlanterBoxComponentData): void {
      const hasPlant = data.plantType !== null;
      if (hasPlant && this.hasPlant !== hasPlant) {
         // Plant sound effect
         playSound("plant.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y);
      }
      this.hasPlant = hasPlant;

      this.updateFertiliserRenderPart(data.plantType);
   }
}

export default PlanterBoxComponent;