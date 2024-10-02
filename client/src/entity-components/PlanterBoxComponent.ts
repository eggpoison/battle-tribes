import { PlanterBoxPlant, ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "./ServerComponent";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { customTickIntervalHasPassed, randInt } from "battletribes-shared/utils";
import { createGrowthParticle } from "../particles";
import { getRandomPointInEntity } from "./TransformComponent";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class PlanterBoxComponent extends ServerComponent {
   private moundRenderPart: RenderPart | null = null;
   
   public hasPlant = false;
   public isFertilised = false;

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      const plantType = reader.readNumber();
      const isFertilised = reader.readBoolean();
      reader.padOffset(3);
      
      if (isFertilised && !this.isFertilised) {
         for (let i = 0; i < 25; i++) {
            createGrowthParticleInEntity(this);
         }

         const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
         playSound("fertiliser.mp3", 0.6, 1, transformComponent.position);
      }
      this.isFertilised = isFertilised;
      
      const hasPlant = plantType !== -1;
      if (hasPlant && this.hasPlant !== hasPlant) {
         // Plant sound effect
         const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
         playSound("plant.mp3", 0.4, 1, transformComponent.position);
      }
      this.hasPlant = hasPlant;

      if (plantType !== -1) {
         if (this.moundRenderPart === null) {
            // @Temporary
            const textureSource = plantType === PlanterBoxPlant.iceSpikes ? "entities/plant/snow-clump.png" : "entities/plant/dirt-clump.png";
            
            this.moundRenderPart = new TexturedRenderPart(
               null,
               1,
               Math.PI / 2 * randInt(0, 3),
               getTextureArrayIndex(textureSource)
            );
            this.entity.attachRenderThing(this.moundRenderPart);
         }
      } else if (this.moundRenderPart !== null) {
         this.entity.removeRenderPart(this.moundRenderPart);
         this.moundRenderPart = null;
      }
   }
}

export default PlanterBoxComponent;

export const PlanterBoxComponentArray = new ComponentArray<PlanterBoxComponent>(ComponentArrayType.server, ServerComponentType.planterBox, true, {
   onTick: onTick
});

const createGrowthParticleInEntity = (planterBoxComponent: PlanterBoxComponent): void => {
   const transformComponent = planterBoxComponent.entity.getServerComponent(ServerComponentType.transform);

   const pos = getRandomPointInEntity(transformComponent);
   createGrowthParticle(pos.x, pos.y);
}
   
function onTick(planterBoxComponent: PlanterBoxComponent): void {
   const transformComponent = planterBoxComponent.entity.getServerComponent(ServerComponentType.transform);
   if (planterBoxComponent.isFertilised && customTickIntervalHasPassed(transformComponent.ageTicks, 0.35)) {
      createGrowthParticleInEntity(planterBoxComponent);
   }
}