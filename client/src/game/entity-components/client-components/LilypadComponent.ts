import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerClientComponentArray } from "../component-register";

export interface LilypadComponentData {}

export interface LilypadComponent {}

class _LilypadComponentArray extends ClientComponentArray<LilypadComponent> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/lilypad/lilypad.png")
         )
      );
   }

   public createComponent(): LilypadComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const LilypadComponentArray = registerClientComponentArray(ClientComponentType.lilypad, _LilypadComponentArray, true);

export function createLilypadComponentData(): LilypadComponentData {
   return {};
}