import { LimbConfiguration, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { updateLimb_TEMP } from "./InventoryUseComponent";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getTransformComponentData } from "../../entity-component-types";

export interface ScrappyComponentData {}

interface IntermediateInfo {}

export interface ScrappyComponent {}

export const ScrappyComponentArray = new ServerComponentArray<ScrappyComponent, ScrappyComponentData, IntermediateInfo>(ServerComponentType.scrappy, true, createComponent, getMaxRenderParts, decodeData);
ScrappyComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): ScrappyComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         // @Copynpaste @Hack
         2,
         0,
         getTextureArrayIndex("entities/scrappy/body.png")
      )
   );

   // @Copynpaste from TribesmanComponent
   // Hands
   const attachPoint = new RenderAttachPoint(
      hitbox,
      1,
      0
   );
   attachPoint.addTag("inventoryUseComponent:attachPoint");
   renderInfo.attachRenderPart(attachPoint);
   
   const handRenderPart = new TexturedRenderPart(
      attachPoint,
      1.2,
      0,
      getTextureArrayIndex("entities/scrappy/hand.png")
   );
   handRenderPart.addTag("inventoryUseComponent:hand");
   renderInfo.attachRenderPart(handRenderPart);

   // @Temporary: so that the hand shows correctly when the player is placing a scrappy
   updateLimb_TEMP(handRenderPart, attachPoint, 20, LimbConfiguration.singleHanded);

   return {};
}

function createComponent(): ScrappyComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}