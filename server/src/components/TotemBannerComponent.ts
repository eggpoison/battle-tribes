import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, TribeTotemBanner } from "battletribes-shared/entities";
import { randInt } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { TRIBE_TOTEM_POSITIONS } from "../entities/structures/tribe-totem";
import { Packet } from "battletribes-shared/packets";

export interface TotemBannerPosition {
   readonly layer: number;
   readonly direction: number;   
}

export class TotemBannerComponent {
   readonly banners: Record<number, TribeTotemBanner> = {};
   // @Cleanup @Memory: We don't need this, just deduce from the banners record
   readonly availableBannerPositions: Array<TotemBannerPosition> = Array.from(new Set(TRIBE_TOTEM_POSITIONS));
}

export const TotemBannerComponentArray = new ComponentArray<TotemBannerComponent>(ServerComponentType.totemBanner, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

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

function getDataLength(entity: EntityID): number {
   const totemBannerComponent = TotemBannerComponentArray.getComponent(entity);

   const numBanners = Object.keys(totemBannerComponent.banners).length;
   return 2 * Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * numBanners;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const totemBannerComponent = TotemBannerComponentArray.getComponent(entity);

   const banners = Object.values(totemBannerComponent.banners);
   packet.addNumber(banners.length);
   for (let i = 0; i < banners.length; i++) {
      const banner = banners[i];
      packet.addNumber(banner.hutNum);
      packet.addNumber(banner.layer);
      packet.addNumber(banner.direction);
   }
}