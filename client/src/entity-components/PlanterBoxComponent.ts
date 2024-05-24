import { PlanterBoxComponentData, PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity, { getRandomPointInEntity } from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import { randInt } from "webgl-test-shared/dist/utils";
import { createGrowthParticle } from "../particles";

class PlanterBoxComponent extends ServerComponent<ServerComponentType.planterBox> {
   private moundRenderPart: RenderPart | null = null;
   
   public hasPlant: boolean;
   public isFertilised: boolean;
   
   constructor(entity: Entity, data: PlanterBoxComponentData) {
      super(entity);

      this.hasPlant = data.plantType !== null;
      this.isFertilised = data.isFertilised;
      this.updateMoundRenderPart(data.plantType);
   }

   private updateMoundRenderPart(plantType: PlanterBoxPlant | null): void {
      if (plantType !== null) {
         if (this.moundRenderPart === null) {
            // @Temporary
            const textureSource = plantType === PlanterBoxPlant.iceSpikes ? "entities/plant/snow-clump.png" : "entities/plant/dirt-clump.png";
            
            this.moundRenderPart = new RenderPart(
               this.entity,
               getTextureArrayIndex(textureSource),
               1,
               Math.PI / 2 * randInt(0, 3)
            );
            this.entity.attachRenderPart(this.moundRenderPart);
         }
      } else if (this.moundRenderPart !== null) {
         this.entity.removeRenderPart(this.moundRenderPart);
         this.moundRenderPart = null;
      }
   }

   public updateFromData(data: PlanterBoxComponentData): void {
      if (data.isFertilised && !this.isFertilised) {
         for (let i = 0; i < 17; i++) {
            const pos = getRandomPointInEntity(this.entity);
            createGrowthParticle(pos.x, pos.y);
         }
      }
      this.isFertilised = data.isFertilised;
      
      const hasPlant = data.plantType !== null;
      if (hasPlant && this.hasPlant !== hasPlant) {
         // Plant sound effect
         playSound("plant.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y);
      }
      this.hasPlant = hasPlant;

      this.updateMoundRenderPart(data.plantType);
   }
}

export default PlanterBoxComponent;