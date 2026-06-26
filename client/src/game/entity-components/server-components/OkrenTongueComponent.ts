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

export interface OkrenTongueComponentData {}

export interface OkrenTongueComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.okrenTongue, typeof OkrenTongueComponentArray> {}
}

export const OkrenTongueComponentArray = registerServerComponentArray(
   ServerComponentType.okrenTongue,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
OkrenTongueComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): OkrenTongueComponentData {
   return createOkrenTongueComponentData();
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

   for (const hitbox of transformComponentData.hitboxes) {
      switch (getHitboxTag(hitbox)) {
         case HitboxTag.okrenTongueSegmentMiddle: {
            const renderPart = new TexturedRenderPart(
               hitbox,
               0,
               0,
               0, 0,
               TextureIndex.entities_okren_tongueSegment
            );
            renderObject.attachRenderPart(renderPart);
            break;
         }
         case HitboxTag.okrenTongueSegmentTip: {
            const renderPart = new TexturedRenderPart(
               hitbox,
               0,
               0,
               0, 0,
               TextureIndex.entities_okren_tongueTip
            );
            renderObject.attachRenderPart(renderPart);
            break;
         }
      }
   }
}

function createComponent(): OkrenTongueComponent {
   return {};
}

function getMaxRenderParts(): number {
   // @HACK cuz tehre isn't a limit!!
   return 100;
}

export function createOkrenTongueComponentData(): OkrenTongueComponentData {
   return {};
}