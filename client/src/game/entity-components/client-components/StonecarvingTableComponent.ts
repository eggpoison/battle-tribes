import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";

export interface StonecarvingTableComponentData {}

export interface StonecarvingTableComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.stonecarvingTable, _StonecarvingTableComponentArray> {}
}

class _StonecarvingTableComponentArray extends _ClientComponentArray<StonecarvingTableComponent, StonecarvingTableComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponent.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            1,
            0,
            0, 0,
            getTextureArrayIndex("entities/stonecarving-table/stonecarving-table.png")
         )
      );
   }

   public createComponent(): StonecarvingTableComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const StonecarvingTableComponentArray = registerClientComponentArray(ClientComponentType.stonecarvingTable, _StonecarvingTableComponentArray, true);

export function createStonecarvingTableComponentData(): StonecarvingTableComponentData {
   return {};
}