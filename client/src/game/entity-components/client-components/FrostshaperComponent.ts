import { TextureIndex } from "../../../texture-index";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { registerClientComponentArray } from "../component-registry";
import { getTransformComponentData } from "../component-types";

export interface FrostshaperComponentData {}

export interface FrostshaperComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.frostshaper, _FrostshaperComponentArray> {}
}

class _FrostshaperComponentArray extends ClientComponentArray<FrostshaperComponent, FrostshaperComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            TextureIndex.entities_frostshaper_frostshaper
         )
      );
   }

   public createComponent(): FrostshaperComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const FrostshaperComponentArray = registerClientComponentArray(ClientComponentType.frostshaper, _FrostshaperComponentArray, true);

export function createFrostshaperComponentData(): FrostshaperComponentData {
   return {};
}