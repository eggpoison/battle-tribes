import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerClientComponentArray } from "../component-registry";

export interface LilypadComponentData {}

export interface LilypadComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.lilypad, _LilypadComponentArray, LilypadComponentData> {}
}

class _LilypadComponentArray extends _ClientComponentArray<LilypadComponent> {
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