import { PacketReader, TribeType, Entity, TribeTotemBanner, ServerComponentType } from "webgl-test-shared";
import { getTextureArrayIndex } from "../../texture-atlases";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { EntityRenderObject } from "../../EntityRenderObject";
import { TribeComponentArray } from "./TribeComponent";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

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

class _TotemBannerComponentArray extends ServerComponentArray<TotemBannerComponent, TotemBannerComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): TotemBannerComponentData {
      const banners: Array<TribeTotemBanner> = [];
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

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      // Main render part
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            1,
            0,
            0, 0,
            getTextureArrayIndex(`entities/tribe-totem/tribe-totem.png`)
         )
      );
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const bannerComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.totemBanner);
      const tribeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribe);
      
      const renderParts: Array<TexturedRenderPart> = [];
      
      for (const banner of Object.values(bannerComponentData.banners)) {
         const renderPart = createBannerRenderPart(tribeComponentData.tribeType, renderObject, hitbox, banner);
         renderParts.push(renderPart);
      }

      return {
         bannerRenderParts: renderParts
      };
   }

   public createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): TotemBannerComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      
      return {
         banners: getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.totemBanner).banners,
         bannerRenderParts: intermediateInfo.bannerRenderParts
      };
   }

   public getMaxRenderParts(): number {
      // @HACK: over time the number of banners can increase so we can't use the number of banners at the start as anything...
      return 20;
   }

   public updateFromData(data: TotemBannerComponentData, entity: Entity): void {
      const totemBannerComponent = TotemBannerComponentArray.getComponent(entity);
      
      // @Garbage
      const removedBannerNums = Object.keys(totemBannerComponent.banners).map(num => Number(num));
      
      const renderObject = getEntityRenderObject(entity);
      
      // Add new banners
      for (const banner of Object.values(data.banners)) {
         if (!totemBannerComponent.banners.hasOwnProperty(banner.hutNum)) {
            const transformComponent = TransformComponentArray.getComponent(entity);
            const hitbox = transformComponent.hitboxes[0];
            
            const tribeComponent = TribeComponentArray.getComponent(entity);
            const renderPart = createBannerRenderPart(tribeComponent.tribeType, renderObject, hitbox, banner);
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
         renderObject.removeRenderPart(totemBannerComponent.bannerRenderParts[hutNum]);
         delete totemBannerComponent.bannerRenderParts[hutNum];
         delete totemBannerComponent.banners[hutNum];
      }
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      playBuildingHitSound(entity, hitbox);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const TotemBannerComponentArray = registerServerComponentArray(ServerComponentType.totemBanner, _TotemBannerComponentArray, true);

export function createTotemBannerComponentData(): TotemBannerComponentData {
   return {
      banners: []
   };
}

const createBannerRenderPart = (tribeType: TribeType, renderObject: EntityRenderObject, parentHitbox: Hitbox, banner: TribeTotemBanner): TexturedRenderPart => {
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

   const bannerOffsetAmount = BANNER_LAYER_DISTANCES[banner.layer];

   const renderPart = new TexturedRenderPart(
      parentHitbox,
      2,
      banner.direction,
      bannerOffsetAmount * Math.sin(banner.direction), bannerOffsetAmount * Math.cos(banner.direction),
      getTextureArrayIndex(`entities/tribe-totem/${totemTextureSourceID}`)
   );

   renderObject.attachRenderPart(renderPart);

   return renderPart;
}