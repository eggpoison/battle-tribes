import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, TribeTotemBanner } from "battletribes-shared/entities";
import { TribeType } from "battletribes-shared/tribes";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { TribeComponentArray } from "./TribeComponent";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

const BANNER_LAYER_DISTANCES = [34, 52, 65];

class TotemBannerComponent {
   public readonly banners: Record<number, TribeTotemBanner> = {};
   public readonly bannerRenderParts: Record<number, RenderPart> = {};
}

export default TotemBannerComponent;

export const TotemBannerComponentArray = new ServerComponentArray<TotemBannerComponent>(ServerComponentType.totemBanner, true, {
   padData: padData,
   updateFromData: updateFromData
});

const createBannerRenderPart = (totemBannerComponent: TotemBannerComponent, entity: EntityID, banner: TribeTotemBanner): void => {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   
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
   totemBannerComponent.bannerRenderParts[banner.hutNum] = renderPart;

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderThing(renderPart);
}

function padData(reader: PacketReader): void {
   const numBanners = reader.readNumber();
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT * numBanners);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const totemBannerComponent = TotemBannerComponentArray.getComponent(entity);
   
   // @Garbage
   const removedBannerNums = Object.keys(totemBannerComponent.banners).map(num => Number(num));
   
   // @Temporary @Speed @Garbage
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
      if (!totemBannerComponent.banners.hasOwnProperty(banner.hutNum)) {
         createBannerRenderPart(totemBannerComponent, entity, banner);
         totemBannerComponent.banners[banner.hutNum] = banner;
      }

      const idx = removedBannerNums.indexOf(banner.hutNum);
      if (idx !== -1) {
         removedBannerNums.splice(idx, 1);
      }
   }
   
   // Remove banners which are no longer there
   const renderInfo = getEntityRenderInfo(entity);
   for (const hutNum of removedBannerNums) {
      renderInfo.removeRenderPart(totemBannerComponent.bannerRenderParts[hutNum]);
      delete totemBannerComponent.bannerRenderParts[hutNum];
      delete totemBannerComponent.banners[hutNum];
   }
}