import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerClientComponentArray } from "../component-registry";

export interface FrostshaperComponentData {}

export interface FrostshaperComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.frostshaper, _FrostshaperComponentArray, FrostshaperComponentData> {}
}

class _FrostshaperComponentArray extends _ClientComponentArray<FrostshaperComponent> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/frostshaper/frostshaper.png")
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