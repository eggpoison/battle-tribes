import { ServerComponentType } from "webgl-test-shared/dist/components";
import { TribeTotemBanner } from "webgl-test-shared/dist/entities";
import { TotemBannerComponentData } from "webgl-test-shared/dist/components";
import { TribeType } from "webgl-test-shared/dist/tribes";
import ServerComponent from "./ServerComponent";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";

const BANNER_LAYER_DISTANCES = [34, 52, 65];

class TotemBannerComponent extends ServerComponent<ServerComponentType.totemBanner> {
   private readonly banners: Record<number, TribeTotemBanner> = {};
   private readonly bannerRenderParts: Record<number, RenderPart> = {};

   constructor(entity: Entity, data: TotemBannerComponentData) {
      super(entity);

      this.updateBanners(data.banners);
   }

   public updateFromData(data: TotemBannerComponentData): void {
      this.updateBanners(data.banners);
   }

   private updateBanners(banners: ReadonlyArray<TribeTotemBanner>): void {
      const removedBannerNums = Object.keys(this.banners).map(num => Number(num));
      
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
      for (const hutNum of removedBannerNums) {
         this.entity.removeRenderPart(this.bannerRenderParts[hutNum]);
         delete this.bannerRenderParts[hutNum];
         delete this.banners[hutNum];
      }
   }

   private createBannerRenderPart(banner: TribeTotemBanner): void {
      const tribeComponent = this.entity.getServerComponent(ServerComponentType.tribe);
      
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

      const renderPart = new RenderPart(
         this.entity,
         getTextureArrayIndex(`entities/tribe-totem/${totemTextureSourceID}`),
         2,
         banner.direction
      );
      const bannerOffsetAmount = BANNER_LAYER_DISTANCES[banner.layer];
      renderPart.offset.x = bannerOffsetAmount * Math.sin(banner.direction);
      renderPart.offset.y = bannerOffsetAmount * Math.cos(banner.direction);
      this.entity.attachRenderPart(renderPart);
      this.bannerRenderParts[banner.hutNum] = renderPart;
   }
}

export default TotemBannerComponent;