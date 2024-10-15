import { PlanterBoxPlant, ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randInt, customTickIntervalHasPassed } from "../../../../shared/src/utils";
import { createGrowthParticle } from "../../particles";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo, getEntityAgeTicks } from "../../world";
import ServerComponent from "../ServerComponent";
import ServerComponentArray from "../ServerComponentArray";
import TransformComponent, { TransformComponentArray, getRandomPointInEntity } from "./TransformComponent";

class PlanterBoxComponent extends ServerComponent {
   public moundRenderPart: RenderPart | null = null;
   
   public hasPlant = false;
   public isFertilised = false;
}

export default PlanterBoxComponent;

export const PlanterBoxComponentArray = new ServerComponentArray<PlanterBoxComponent>(ServerComponentType.planterBox, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

const createGrowthParticleInEntity = (transformComponent: TransformComponent): void => {
   const pos = getRandomPointInEntity(transformComponent);
   createGrowthParticle(pos.x, pos.y);
}
   
function onTick(planterBoxComponent: PlanterBoxComponent, entity: EntityID): void {
   if (planterBoxComponent.isFertilised && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.35)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      createGrowthParticleInEntity(transformComponent);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   
   const plantType = reader.readNumber();
   const isFertilised = reader.readBoolean();
   reader.padOffset(3);
   
   if (isFertilised && !planterBoxComponent.isFertilised) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      for (let i = 0; i < 25; i++) {
         createGrowthParticleInEntity(transformComponent);
      }

      playSound("fertiliser.mp3", 0.6, 1, transformComponent.position);
   }
   planterBoxComponent.isFertilised = isFertilised;
   
   const hasPlant = plantType !== -1;
   if (hasPlant && planterBoxComponent.hasPlant !== hasPlant) {
      // Plant sound effect
      const transformComponent = TransformComponentArray.getComponent(entity);
      playSound("plant.mp3", 0.4, 1, transformComponent.position);
   }
   planterBoxComponent.hasPlant = hasPlant;

   if (plantType !== -1) {
      if (planterBoxComponent.moundRenderPart === null) {
         // @Temporary
         const textureSource = plantType === PlanterBoxPlant.iceSpikes ? "entities/plant/snow-clump.png" : "entities/plant/dirt-clump.png";
         
         planterBoxComponent.moundRenderPart = new TexturedRenderPart(
            null,
            1,
            Math.PI / 2 * randInt(0, 3),
            getTextureArrayIndex(textureSource)
         );
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderThing(planterBoxComponent.moundRenderPart);
      }
   } else if (planterBoxComponent.moundRenderPart !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(planterBoxComponent.moundRenderPart);
      planterBoxComponent.moundRenderPart = null;
   }
}