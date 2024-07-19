import { PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { customTickIntervalHasPassed, randInt } from "webgl-test-shared/dist/utils";
import { createGrowthParticle } from "../particles";
import { getRandomPointInEntity } from "./TransformComponent";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "webgl-test-shared/dist/packets";

class PlanterBoxComponent extends ServerComponent {
   private moundRenderPart: RenderPart | null = null;
   
   public hasPlant: boolean;
   public isFertilised: boolean;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      const plantType = reader.readNumber();
      this.hasPlant = plantType !== -1;
      this.isFertilised = reader.readBoolean();
      reader.padOffset(3);
      
      this.updateMoundRenderPart(plantType);
   }

   private createGrowthParticle(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);

      const pos = getRandomPointInEntity(transformComponent);
      createGrowthParticle(pos.x, pos.y);
   }
   
   public tick(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      if (this.isFertilised && customTickIntervalHasPassed(transformComponent.ageTicks, 0.35)) {
         this.createGrowthParticle();
      }
   }

   private updateMoundRenderPart(plantType: PlanterBoxPlant | -1): void {
      if (plantType !== -1) {
         if (this.moundRenderPart === null) {
            // @Temporary
            const textureSource = plantType === PlanterBoxPlant.iceSpikes ? "entities/plant/snow-clump.png" : "entities/plant/dirt-clump.png";
            
            this.moundRenderPart = new TexturedRenderPart(
               this.entity,
               1,
               Math.PI / 2 * randInt(0, 3),
               getTextureArrayIndex(textureSource)
            );
            this.entity.attachRenderPart(this.moundRenderPart);
         }
      } else if (this.moundRenderPart !== null) {
         this.entity.removeRenderPart(this.moundRenderPart);
         this.moundRenderPart = null;
      }
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      const plantType = reader.readNumber();
      const isFertilised = reader.readBoolean();
      reader.padOffset(3);
      
      if (isFertilised && !this.isFertilised) {
         for (let i = 0; i < 25; i++) {
            this.createGrowthParticle();
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

      this.updateMoundRenderPart(plantType);
   }
}

export default PlanterBoxComponent;