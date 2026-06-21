import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface StonecarvingTableComponentData {}

export interface StonecarvingTableComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.stonecarvingTable, _StonecarvingTableComponentArray> {}
}

class _StonecarvingTableComponentArray extends ClientComponentArray<StonecarvingTableComponent, StonecarvingTableComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponent.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            1,
            0,
            0, 0,
            TextureIndex.entities_stonecarvingTable_stonecarvingTable
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