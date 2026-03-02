import { ServerComponentType } from "battletribes-shared/components";
import { Entity, TribeTotemBanner } from "battletribes-shared/entities";
import { randInt } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
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

// @Memory: useless after
const NUM_TOTEM_POSITIONS = [4, 6, 8];

const TRIBE_TOTEM_POSITIONS = new Array<TotemBannerPosition>();
for (let layerIdx = 0; layerIdx < 3; layerIdx++) {
   const numPositions = NUM_TOTEM_POSITIONS[layerIdx];
   for (let j = 0; j < numPositions; j++) {
      const angle = j / numPositions * 2 * Math.PI;
      TRIBE_TOTEM_POSITIONS.push({
         layer: layerIdx,
         direction: angle
      });
   }
}

export const TotemBannerComponentArray = new ComponentArray<TotemBannerComponent>(ServerComponentType.totemBanner, true, getDataLength, addDataToPacket);

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

function getDataLength(entity: Entity): number {
   const totemBannerComponent = TotemBannerComponentArray.getComponent(entity);

   const numBanners = Object.keys(totemBannerComponent.banners).length;
   return Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * numBanners;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const totemBannerComponent = TotemBannerComponentArray.getComponent(entity);

   const banners = Object.values(totemBannerComponent.banners);
   packet.writeNumber(banners.length);
   for (let i = 0; i < banners.length; i++) {
      const banner = banners[i];
      packet.writeNumber(banner.hutNum);
      packet.writeNumber(banner.layer);
      packet.writeNumber(banner.direction);
   }
}