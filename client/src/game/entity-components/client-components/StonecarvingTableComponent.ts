import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerClientComponentArray } from "../component-register";

export interface StonecarvingTableComponentData {}

export interface StonecarvingTableComponent {}

class _StonecarvingTableComponentArray extends ClientComponentArray<StonecarvingTableComponent> {
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