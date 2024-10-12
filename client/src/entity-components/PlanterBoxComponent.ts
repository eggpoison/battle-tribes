import { PlanterBoxPlant, ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "./ServerComponent";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { customTickIntervalHasPassed, randInt } from "battletribes-shared/utils";
import { createGrowthParticle } from "../particles";
import TransformComponent, { getRandomPointInEntity, TransformComponentArray } from "./TransformComponent";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { getEntityRenderInfo } from "../world";
import { EntityID } from "../../../shared/src/entities";

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
         const transformComponent = TransformComponentArray.getComponent(this.entity.id);
         for (let i = 0; i < 25; i++) {
            createGrowthParticleInEntity(transformComponent);
         }

         playSound("fertiliser.mp3", 0.6, 1, transformComponent.position);
      }
      this.isFertilised = isFertilised;
      
      const hasPlant = plantType !== -1;
      if (hasPlant && this.hasPlant !== hasPlant) {
         // Plant sound effect
         const transformComponent = TransformComponentArray.getComponent(this.entity.id);
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
            const renderInfo = getEntityRenderInfo(this.entity.id);
            renderInfo.attachRenderThing(this.moundRenderPart);
         }
      } else if (this.moundRenderPart !== null) {
         const renderInfo = getEntityRenderInfo(this.entity.id);
         renderInfo.removeRenderPart(this.moundRenderPart);
         this.moundRenderPart = null;
      }
   }
}

export default PlanterBoxComponent;

export const PlanterBoxComponentArray = new ComponentArray<PlanterBoxComponent>(ComponentArrayType.server, ServerComponentType.planterBox, true, {
   onTick: onTick
});

const createGrowthParticleInEntity = (transformComponent: TransformComponent): void => {
   const pos = getRandomPointInEntity(transformComponent);
   createGrowthParticle(pos.x, pos.y);
}
   
function onTick(planterBoxComponent: PlanterBoxComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (planterBoxComponent.isFertilised && customTickIntervalHasPassed(transformComponent.ageTicks, 0.35)) {
      createGrowthParticleInEntity(transformComponent);
   }
}