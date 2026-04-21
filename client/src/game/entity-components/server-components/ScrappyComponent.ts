import { LimbConfiguration, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { updateLimb_TEMP } from "./InventoryUseComponent";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";

export interface ScrappyComponentData {}

interface IntermediateInfo {}

export interface ScrappyComponent {}

export const ScrappyComponentArray = new ServerComponentArray<ScrappyComponent, ScrappyComponentData, IntermediateInfo>(ServerComponentType.scrappy, true, createComponent, getMaxRenderParts, decodeData);
ScrappyComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): ScrappyComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         // @Copynpaste @Hack
         2,
         0,
         0, 0,
         getTextureArrayIndex("entities/scrappy/body.png")
      )
   );

   // @Copynpaste from TribesmanComponent
   // Hands
   const attachPoint = new RenderAttachPoint(
      hitbox,
      1,
      0,
      0, 0
   );
   addRenderPartTag(attachPoint, "inventoryUseComponent:attachPoint");
   renderObject.attachRenderPart(attachPoint);
   
   const handRenderPart = new TexturedRenderPart(
      attachPoint,
      1.2,
      0,
      getTextureArrayIndex("entities/scrappy/hand.png"),
      0, 0
   );
   addRenderPartTag(handRenderPart, "inventoryUseComponent:hand");
   renderObject.attachRenderPart(handRenderPart);

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