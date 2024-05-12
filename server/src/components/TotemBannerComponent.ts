import { TotemBannerComponentData } from "webgl-test-shared/dist/components";
import { TribeTotemBanner } from "webgl-test-shared/dist/entities";
import { randInt } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { TotemBannerComponentArray } from "./ComponentArray";

export interface TotemBannerPosition {
   readonly layer: number;
   readonly direction: number;   
}

export interface TotemBannerComponent {
   readonly banners: Record<number, TribeTotemBanner>;
   // @Cleanup @Memory: We don't need this, just deduce from the banners record
   readonly availableBannerPositions: Array<TotemBannerPosition>;
}

export function addBannerToTotem(bannerComponent: TotemBannerComponent, hutNum: number): void {
   if (bannerComponent.availableBannerPositions.length === 0) {
      return;
   }
   
   const positionIdx = randInt(0, bannerComponent.availableBannerPositions.length - 1);
   const position = bannerComponent.availableBannerPositions[positionIdx];
   bannerComponent.availableBannerPositions.splice(positionIdx, 1);
   
   const banner: TribeTotemBanner = {
      hutNum: hutNum,
      layer: position.layer,
      direction: position.direction
   };
   bannerComponent.banners[hutNum] = banner;
}

export function removeBannerFromTotem(bannerComponent: TotemBannerComponent, hutNum: number): void {
   delete bannerComponent.banners[hutNum];
}

export function serialiseTotemBannerComponent(entity: Entity): TotemBannerComponentData {
   const totemBannerComponent = TotemBannerComponentArray.getComponent(entity.id);
   return {
      // @Speed
      banners: Object.values(totemBannerComponent.banners)
   };
}