import { ServerComponentType } from "battletribes-shared/components";
import { TribeTotemBanner } from "battletribes-shared/entities";
import { TribeType } from "battletribes-shared/tribes";
import ServerComponent from "./ServerComponent";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { TribeComponentArray } from "./TribeComponent";
import { getEntityRenderInfo } from "../world";

const BANNER_LAYER_DISTANCES = [34, 52, 65];

class TotemBannerComponent extends ServerComponent {
   private readonly banners: Record<number, TribeTotemBanner> = {};
   private readonly bannerRenderParts: Record<number, RenderPart> = {};

   public padData(reader: PacketReader): void {
      const numBanners = reader.readNumber();
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT * numBanners);
   }

   public updateFromData(reader: PacketReader): void {
      this.updateBanners(reader);
   }

   private updateBanners(reader: PacketReader): void {
      const removedBannerNums = Object.keys(this.banners).map(num => Number(num));
      
      // @Temporary @Speed
      const banners = new Array<TribeTotemBanner>();
      const numBanners = reader.readNumber();
      for (let i = 0; i < numBanners; i++) {
         const hutNum = reader.readNumber();
         const layer = reader.readNumber();
         const direction = reader.readNumber();

         const banner: TribeTotemBanner = {
            hutNum: hutNum,
            layer: layer,
            direction: direction
         };
         banners.push(banner);
      }
      
      // Add new banners
      for (const banner of banners) {
         if (!this.banners.hasOwnProperty(banner.hutNum)) {
            this.createBannerRenderPart(banner);
            this.banners[banner.hutNum] = banner;
         }

         const idx = removedBannerNums.indexOf(banner.hutNum);
         if (idx !== -1) {
            removedBannerNums.splice(idx, 1);
         }
      }
      
      // Remove banners which are no longer there
      const renderInfo = getEntityRenderInfo(this.entity.id);
      for (const hutNum of removedBannerNums) {
         renderInfo.removeRenderPart(this.bannerRenderParts[hutNum]);
         delete this.bannerRenderParts[hutNum];
         delete this.banners[hutNum];
      }
   }

   private createBannerRenderPart(banner: TribeTotemBanner): void {
      const tribeComponent = TribeComponentArray.getComponent(this.entity.id);
      
      let totemTextureSourceID: string;
      switch (tribeComponent.tribeType) {
         case TribeType.plainspeople: {
            totemTextureSourceID = "plainspeople-banner.png";
            break;
         }
         case TribeType.goblins: {
            totemTextureSourceID = "goblin-banner.png";
            break;
         }
         case TribeType.barbarians: {
            totemTextureSourceID = "barbarian-banner.png";
            break;
         }
         case TribeType.frostlings: {
            totemTextureSourceID = "frostling-banner.png";
            break;
         }
      }

      const renderPart = new TexturedRenderPart(
         null,
         2,
         banner.direction,
         getTextureArrayIndex(`entities/tribe-ttem/${totemTextureSourceID}`)
      );
      const bannerOffsetAmount = BANNER_LAYER_DISTANCES[banner.layer];
      renderPart.offset.x = bannerOffsetAmount * Math.sin(banner.direction);
      renderPart.offset.y = bannerOffsetAmount * Math.cos(banner.direction);
      this.bannerRenderParts[banner.hutNum] = renderPart;

      const renderInfo = getEntityRenderInfo(this.entity.id);
      renderInfo.attachRenderThing(renderPart);
   }
}

export default TotemBannerComponent;

export const TotemBannerComponentArray = new ComponentArray<TotemBannerComponent>(ComponentArrayType.server, ServerComponentType.totemBanner, true, {});