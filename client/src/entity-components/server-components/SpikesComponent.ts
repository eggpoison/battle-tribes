import { randFloat } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "../ServerComponent";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { playSound } from "../../sound";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle } from "../../particles";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";

export const NUM_SMALL_COVER_LEAVES = 8;
export const NUM_LARGE_COVER_LEAVES = 3;

class SpikesComponent extends ServerComponent {
   // @Cleanup: should be in particles.ts
   public static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   public static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;
   
   public readonly leafRenderParts: ReadonlyArray<RenderPart>;

   public isCovered = false;

   constructor(entity: EntityID) {
      super();

      const leafRenderParts = new Array<RenderPart>();
      for (let i = 0; i < NUM_SMALL_COVER_LEAVES; i++) {
         const renderPart = this.createLeafRenderPart(entity, true);
         leafRenderParts.push(renderPart);
      }
      for (let i = 0; i < NUM_LARGE_COVER_LEAVES; i++) {
         const renderPart = this.createLeafRenderPart(entity, false);
         leafRenderParts.push(renderPart);
      }
      this.leafRenderParts = leafRenderParts;
   }

   private createLeafRenderPart(entity: EntityID, isSmall: boolean): RenderPart {
      let textureSource: string;
      if (isSmall) {
         textureSource = "entities/miscellaneous/cover-leaf-small.png";
      } else {
         textureSource = "entities/miscellaneous/cover-leaf-large.png";
      }
      
      const renderPart = new TexturedRenderPart(
         null,
         1 + Math.random() * 0.5,
         2 * Math.PI * Math.random(),
         getTextureArrayIndex(textureSource)
      );

      const spawnRange = isSmall ? 24 : 18;
   
      renderPart.offset.x = randFloat(-spawnRange, spawnRange);
      renderPart.offset.y = randFloat(-spawnRange, spawnRange);
   
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.attachRenderThing(renderPart);
   
      return renderPart;
   }
}

export default SpikesComponent;

export const SpikesComponentArray = new ServerComponentArray<SpikesComponent>(ServerComponentType.spikes, true, {
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData
});

function onLoad(spikesComponent: SpikesComponent): void {
   updateLeafRenderParts(spikesComponent);
}

function updateLeafRenderParts(spikesComponent: SpikesComponent): void {
   const opacity = spikesComponent.isCovered ? 0.8 : 0;
   for (let i = 0; i < spikesComponent.leafRenderParts.length; i++) {
      const renderPart = spikesComponent.leafRenderParts[i];
      renderPart.opacity = opacity;
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const spikesComponent = SpikesComponentArray.getComponent(entity);
   
   const isCoveredBefore = spikesComponent.isCovered;
   
   spikesComponent.isCovered = reader.readBoolean();
   reader.padOffset(3);
   
   if (isCoveredBefore !== spikesComponent.isCovered) {
      const transformComponent = TransformComponentArray.getComponent(entity);

      if (spikesComponent.isCovered) {
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
      
      updateLeafRenderParts(spikesComponent);
   }
}