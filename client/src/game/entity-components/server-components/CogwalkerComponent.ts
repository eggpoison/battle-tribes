import { LimbConfiguration } from "../../../../../shared/src/attack-patterns";
import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { updateLimb_TEMP } from "./InventoryUseComponent";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface CogwalkerComponentData {}

export interface CogwalkerComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.cogwalker, typeof CogwalkerComponentArray> {}
}

export const CogwalkerComponentArray = registerServerComponentArray(
   ServerComponentType.cogwalker,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
CogwalkerComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): CogwalkerComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         // @Copynpaste @Hack
         2,
         0,
         0, 0,
         TextureIndex.entities_cogwalker_body
      )
   );

   // @Copynpaste from TribesmanComponent
   // Hands
   for (let i = 0; i < 2; i++) {
      const attachPoint = new RenderAttachPoint(
         hitbox,
         1,
         0,
         0, 0
      );
      if (i === 1) {
         attachPoint.setFlipX(true);
      }
      addRenderPartTag(attachPoint, "inventoryUseComponent:attachPoint");
      renderObject.attachRenderPart(attachPoint);
      
      const handRenderPart = new TexturedRenderPart(
         attachPoint,
         1.2,
         0,
         0, 0,
         TextureIndex.entities_cogwalker_hand
      );
      addRenderPartTag(handRenderPart, "inventoryUseComponent:hand");
      renderObject.attachRenderPart(handRenderPart);

      // @Temporary: so that the hand shows correctly when the player is placing a cogwalker
      updateLimb_TEMP(handRenderPart, attachPoint, 28, LimbConfiguration.twoHanded);
   }
}

function createComponent(): CogwalkerComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}