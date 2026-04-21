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
import { registerServerComponentArray } from "../component-register";

export interface CogwalkerComponentData {}

export interface CogwalkerComponent {}

class _CogwalkerComponentArray extends ServerComponentArray<CogwalkerComponent, CogwalkerComponentData> {
   public decodeData(): CogwalkerComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            // @Copynpaste @Hack
            2,
            0,
            0, 0,
            getTextureArrayIndex("entities/cogwalker/body.png")
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
            getTextureArrayIndex("entities/cogwalker/hand.png")
         );
         addRenderPartTag(handRenderPart, "inventoryUseComponent:hand");
         renderObject.attachRenderPart(handRenderPart);

         // @Temporary: so that the hand shows correctly when the player is placing a cogwalker
         updateLimb_TEMP(handRenderPart, attachPoint, 28, LimbConfiguration.twoHanded);
      }
   }

   public createComponent(): CogwalkerComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 3;
   }
}

export const CogwalkerComponentArray = registerServerComponentArray(ServerComponentType.cogwalker, _CogwalkerComponentArray, true);