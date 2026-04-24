import { LimbConfiguration, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { updateLimb_TEMP } from "./InventoryUseComponent";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";

export interface ScrappyComponentData {}

export interface ScrappyComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.scrappy, _ScrappyComponentArray> {}
}

class _ScrappyComponentArray extends _ServerComponentArray<ScrappyComponent, ScrappyComponentData> {
   public decodeData(): ScrappyComponentData {
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
   }

   public createComponent(): ScrappyComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 3;
   }
}

export const ScrappyComponentArray = registerServerComponentArray(ServerComponentType.scrappy, _ScrappyComponentArray, true);