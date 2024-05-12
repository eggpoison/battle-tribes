import { randFloat } from "webgl-test-shared/dist/utils";
import { ServerComponentType, SpikesComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import Game from "../Game";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

export const NUM_SMALL_COVER_LEAVES = 8;
export const NUM_LARGE_COVER_LEAVES = 3;

class SpikesComponent extends ServerComponent<ServerComponentType.spikes> {
   private readonly renderPart: RenderPart;
   private readonly leafRenderParts: ReadonlyArray<RenderPart>;

   public isCovered: boolean;
   public readonly attachedWallID: number;

   constructor(entity: Entity, data: SpikesComponentData, renderPart: RenderPart) {
      super(entity);

      this.renderPart = renderPart;
      
      this.isCovered = data.isCovered;
      this.attachedWallID = data.attachedWallID;

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
      
      const renderPart = new RenderPart(
         this.entity,
         getTextureArrayIndex(textureSource),
         1 + Math.random() * 0.5,
         2 * Math.PI * Math.random()
      );

      const spawnRange = isSmall ? 24 : 18;
   
      renderPart.offset.x = randFloat(-spawnRange, spawnRange);
      renderPart.offset.y = randFloat(-spawnRange, spawnRange);
   
      this.entity.attachRenderPart(renderPart);
   
      return renderPart;
   }

   public onLoad(): void {
      this.updateRenderPart();
   }

   private updateLeafRenderParts(shouldShow: boolean): void {
      const opacity = shouldShow ? 0.8 : 0;
      for (let i = 0; i < this.leafRenderParts.length; i++) {
         const renderPart = this.leafRenderParts[i];
         renderPart.opacity = opacity;
      }
   }

   private updateRenderPart(): void {
      let shouldShowRenderPart: boolean;
      
      const tribeComponent = this.entity.getServerComponent(ServerComponentType.tribe);
      if (tribeComponent.tribeID !== Game.tribe.id) {
         if (this.isCovered) {
            shouldShowRenderPart = false;
         } else {
            shouldShowRenderPart = true;
         }

         this.updateLeafRenderParts(false);
      } else {
         shouldShowRenderPart = true;

         this.updateLeafRenderParts(this.isCovered);
      }

      this.renderPart.opacity = shouldShowRenderPart ? 1 : 0;
   }

   public updateFromData(data: SpikesComponentData): void {
      const isCoveredBefore = this.isCovered;
      
      this.isCovered = data.isCovered;
      
      if (isCoveredBefore !== this.isCovered) {
         this.updateRenderPart();
      }
   }
}

export default SpikesComponent;