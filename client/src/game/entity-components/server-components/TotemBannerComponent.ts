import { ServerComponentType } from "battletribes-shared/components";
import { Entity, TribeTotemBanner } from "battletribes-shared/entities";
import { TribeType } from "battletribes-shared/tribes";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { EntityComponentData, getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { TribeComponentArray } from "./TribeComponent";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";

export interface TotemBannerComponentData {
   readonly banners: Record<number, TribeTotemBanner>;
}

interface IntermediateInfo {
   readonly bannerRenderParts: Record<number, VisualRenderPart>;
}

export interface TotemBannerComponent {
   readonly banners: Record<number, TribeTotemBanner>;
   readonly bannerRenderParts: Record<number, VisualRenderPart>;
}

const BANNER_LAYER_DISTANCES = [34, 52, 65];

export const TotemBannerComponentArray = new ServerComponentArray<TotemBannerComponent, TotemBannerComponentData, IntermediateInfo>(ServerComponentType.totemBanner, true, createComponent, getMaxRenderParts, decodeData);
TotemBannerComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TotemBannerComponentArray.updateFromData = updateFromData;
TotemBannerComponentArray.onHit = onHit;
TotemBannerComponentArray.onDie = onDie;

export function createTotemBannerComponentData(): TotemBannerComponentData {
   return {
      banners: []
   };
}

function decodeData(reader: PacketReader): TotemBannerComponentData {
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

   return {
      banners: banners
   };
}

const createBannerRenderPart = (tribeType: TribeType, renderInfo: EntityRenderInfo, parentHitbox: Hitbox, banner: TribeTotemBanner): TexturedRenderPart => {
   let totemTextureSourceID: string;
   switch (tribeType) {
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
      case TribeType.dwarves: {
         totemTextureSourceID = "dwarf-banner.png";
         break;
      }
   }

   const renderPart = new TexturedRenderPart(
      parentHitbox,
      2,
      banner.direction,
      getTextureArrayIndex(`entities/tribe-totem/${totemTextureSourceID}`)
   );
   const bannerOffsetAmount = BANNER_LAYER_DISTANCES[banner.layer];
   renderPart.offset.x = bannerOffsetAmount * Math.sin(banner.direction);
   renderPart.offset.y = bannerOffsetAmount * Math.cos(banner.direction);

   renderInfo.attachRenderPart(renderPart);

   return renderPart;
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   // Main render part
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         getTextureArrayIndex(`entities/tribe-totem/tribe-totem.png`)
      )
   );
   
   const bannerComponentData = entityComponentData.serverComponentData[ServerComponentType.totemBanner]!;
   const tribeComponentData = entityComponentData.serverComponentData[ServerComponentType.tribe]!;
   
   const renderParts = new Array<TexturedRenderPart>();
   
   for (const banner of Object.values(bannerComponentData.banners)) {
      const renderPart = createBannerRenderPart(tribeComponentData.tribeType, renderInfo, hitbox, banner);
      renderParts.push(renderPart);
   }

   return {
      bannerRenderParts: renderParts
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): TotemBannerComponent {
   return {
      banners: entityComponentData.serverComponentData[ServerComponentType.totemBanner]!.banners,
      bannerRenderParts: intermediateInfo.bannerRenderParts
   };
}

function getMaxRenderParts(): number {
   // @HACK: over time the number of banners can increase so we can't use the number of banners at the start as anything...
   return 20;
}

function updateFromData(data: TotemBannerComponentData, entity: Entity): void {
   const totemBannerComponent = TotemBannerComponentArray.getComponent(entity);
   
   // @Garbage
   const removedBannerNums = Object.keys(totemBannerComponent.banners).map(num => Number(num));
   
   const renderInfo = getEntityRenderInfo(entity);
   
   // Add new banners
   for (const banner of Object.values(data.banners)) {
      if (!totemBannerComponent.banners.hasOwnProperty(banner.hutNum)) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];
         
         const tribeComponent = TribeComponentArray.getComponent(entity);
         const renderPart = createBannerRenderPart(tribeComponent.tribeType, renderInfo, hitbox, banner);
         totemBannerComponent.bannerRenderParts[banner.hutNum] = renderPart;
         totemBannerComponent.banners[banner.hutNum] = banner;
      }

      const idx = removedBannerNums.indexOf(banner.hutNum);
      if (idx !== -1) {
         removedBannerNums.splice(idx, 1);
      }
   }
   
   // Remove banners which are no longer there
   for (const hutNum of removedBannerNums) {
      renderInfo.removeRenderPart(totemBannerComponent.bannerRenderParts[hutNum]);
      delete totemBannerComponent.bannerRenderParts[hutNum];
      delete totemBannerComponent.banners[hutNum];
   }
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}