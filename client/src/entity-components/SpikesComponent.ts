import { randFloat } from "webgl-test-shared/dist/utils";
import { ServerComponentType, SpikesComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle } from "../particles";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

export const NUM_SMALL_COVER_LEAVES = 8;
export const NUM_LARGE_COVER_LEAVES = 3;

class SpikesComponent extends ServerComponent<ServerComponentType.spikes> {
   // @Cleanup: should be in particles.ts
   public static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   public static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;
   
   private readonly leafRenderParts: ReadonlyArray<RenderPart>;

   public isCovered: boolean;

   constructor(entity: Entity, data: SpikesComponentData) {
      super(entity);

      this.isCovered = data.isCovered;

      const leafRenderParts = new Array<RenderPart>();
      for (let i = 0; i < NUM_SMALL_COVER_LEAVES; i++) {
         const renderPart = this.createLeafRenderPart(true);
         leafRenderParts.push(renderPart);
      }
      for (let i = 0; i < NUM_LARGE_COVER_LEAVES; i++) {
         const renderPart = this.createLeafRenderPart(false);
         leafRenderParts.push(renderPart);
      }
      this.leafRenderParts = leafRenderParts;
   }

   private createLeafRenderPart(isSmall: boolean): RenderPart {
      let textureSource: string;
      if (isSmall) {
         textureSource = "entities/miscellaneous/cover-leaf-small.png";
      } else {
         textureSource = "entities/miscellaneous/cover-leaf-large.png";
      }
      
      const renderPart = new TexturedRenderPart(
         this.entity,
         1 + Math.random() * 0.5,
         2 * Math.PI * Math.random(),
         getTextureArrayIndex(textureSource)
      );

      const spawnRange = isSmall ? 24 : 18;
   
      renderPart.offset.x = randFloat(-spawnRange, spawnRange);
      renderPart.offset.y = randFloat(-spawnRange, spawnRange);
   
      this.entity.attachRenderPart(renderPart);
   
      return renderPart;
   }

   public onLoad(): void {
      this.updateLeafRenderParts();
   }

   private updateLeafRenderParts(): void {
      const opacity = this.isCovered ? 0.8 : 0;
      for (let i = 0; i < this.leafRenderParts.length; i++) {
         const renderPart = this.leafRenderParts[i];
         renderPart.opacity = opacity;
      }
   }

   public updateFromData(data: SpikesComponentData): void {
      const isCoveredBefore = this.isCovered;
      
      this.isCovered = data.isCovered;
      
      if (isCoveredBefore !== this.isCovered) {
         const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);

         if (this.isCovered) {
            // When covering trap
            playSound("trap-cover.mp3", 0.4, 1, transformComponent.position);
         } else {
            // When trap is sprung
            playSound("trap-spring.mp3", 0.4, 1, transformComponent.position);
      
            // Create leaf particles
            for (let i = 0; i < 4; i++) {
               const position = transformComponent.position.offset(randFloat(0, 22), 2 * Math.PI * Math.random())
               createLeafParticle(position.x, position.y, 2 * Math.PI * Math.random() + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
            }
            
            // Create leaf specks
            for (let i = 0; i < 7; i++) {
               createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, randFloat(0, 16), SpikesComponent.LEAF_SPECK_COLOUR_LOW, SpikesComponent.LEAF_SPECK_COLOUR_HIGH);
            }
         }
         
         this.updateLeafRenderParts();
      }
   }
}

export default SpikesComponent;