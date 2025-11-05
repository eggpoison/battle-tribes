import { ServerComponentType } from "webgl-test-shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { LimbConfiguration } from "../../../../../shared/src/attack-patterns";
import { updateLimb_TEMP } from "./InventoryUseComponent";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface CogwalkerComponentData {}

interface IntermediateInfo {}

export interface CogwalkerComponent {}

export const CogwalkerComponentArray = new ServerComponentArray<CogwalkerComponent, CogwalkerComponentData, IntermediateInfo>(ServerComponentType.cogwalker, true, createComponent, getMaxRenderParts, decodeData);
CogwalkerComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): CogwalkerComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         // @Copynpaste @Hack
         2,
         0,
         getTextureArrayIndex("entities/cogwalker/body.png")
      )
   );

   // @Copynpaste from TribesmanComponent
   // Hands
   for (let i = 0; i < 2; i++) {
      const attachPoint = new RenderAttachPoint(
         hitbox,
         1,
         0
      );
      if (i === 1) {
         attachPoint.setFlipX(true);
      }
      attachPoint.addTag("inventoryUseComponent:attachPoint");
      renderInfo.attachRenderPart(attachPoint);
      
      const handRenderPart = new TexturedRenderPart(
         attachPoint,
         1.2,
         0,
         getTextureArrayIndex("entities/cogwalker/hand.png")
      );
      handRenderPart.addTag("inventoryUseComponent:hand");
      renderInfo.attachRenderPart(handRenderPart);

      // @Temporary: so that the hand shows correctly when the player is placing a cogwalker
      updateLimb_TEMP(handRenderPart, attachPoint, 28, LimbConfiguration.twoHanded);
   }

   return {};
}

function createComponent(): CogwalkerComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}