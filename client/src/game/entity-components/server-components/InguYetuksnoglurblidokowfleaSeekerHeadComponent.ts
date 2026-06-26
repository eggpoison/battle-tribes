import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { getHitboxTag } from "../../hitboxes";
import { TextureIndex } from "../../../texture-index";

export interface InguYetuksnoglurblidokowfleaSeekerHeadComponentData {}

export interface InguYetuksnoglurblidokowfleaSeekerHeadComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead, typeof InguYetuksnoglurblidokowfleaSeekerHeadComponentArray> {}
}

export const InguYetuksnoglurblidokowfleaSeekerHeadComponentArray = registerServerComponentArray(
   ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
InguYetuksnoglurblidokowfleaSeekerHeadComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): InguYetuksnoglurblidokowfleaSeekerHeadComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];
      const tag = getHitboxTag(hitbox);
      if (tag === HitboxTag.yetukTrunkMiddle) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            0, 0,
            TextureIndex.entities_tukmokTrunk_middleSegment
         );
         renderObject.attachRenderPart(renderPart);
      } else if (tag === HitboxTag.yetukTrunkHead) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            0, 0,
            TextureIndex.entities_tukmokTrunk_headSegment
         );
         renderObject.attachRenderPart(renderPart);
      } else if (tag === HitboxTag.cowHead) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            0, 0,
            TextureIndex.entities_cow_cowHead1
         );
         renderObject.attachRenderPart(renderPart);
      } else if (tag === HitboxTag.tukmokHead) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            0, 0,
            TextureIndex.entities_tukmok_head
         );
         renderObject.attachRenderPart(renderPart);
      } else if (tag === HitboxTag.yetukMandibleBig) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.6,
            0,
            0, 0,
            TextureIndex.entities_okren_adult_mandible
         );
         renderObject.attachRenderPart(renderPart);
      } else if (tag === HitboxTag.yetukMandibleMedium) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.6,
            0,
            0, 0,
            TextureIndex.entities_okren_juvenile_mandible
         );
         renderObject.attachRenderPart(renderPart);
      }
   }
}

function createComponent(): InguYetuksnoglurblidokowfleaSeekerHeadComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 50;
}

export function createInguYetuksnoglurblidokowfleaSeekerHeadComponentData(): InguYetuksnoglurblidokowfleaSeekerHeadComponentData {
   return {};
}