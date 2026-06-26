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

export interface ScrappyComponentData {}

export interface ScrappyComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.scrappy, typeof ScrappyComponentArray> {}
}

export const ScrappyComponentArray = registerServerComponentArray(
   ServerComponentType.scrappy,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
ScrappyComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): ScrappyComponentData {
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
         TextureIndex.entities_scrappy_body
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
      0, 0,
      TextureIndex.entities_scrappy_hand
   );
   addRenderPartTag(handRenderPart, "inventoryUseComponent:hand");
   renderObject.attachRenderPart(handRenderPart);

   // @Temporary: so that the hand shows correctly when the player is placing a scrappy
   updateLimb_TEMP(handRenderPart, attachPoint, 20, LimbConfiguration.singleHanded);
}

function createComponent(): ScrappyComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}