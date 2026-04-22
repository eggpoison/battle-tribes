import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerClientComponentArray } from "../component-registry";

export interface WorkbenchComponentData {}

export interface WorkbenchComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.workbench, _WorkbenchComponentArray, WorkbenchComponentData> {}
}

class _WorkbenchComponentArray extends _ClientComponentArray<WorkbenchComponent> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/workbench/workbench.png")
         )
      );
   }

   public createComponent(): WorkbenchComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const WorkbenchComponentArray = registerClientComponentArray(ClientComponentType.workbench, _WorkbenchComponentArray, true);

export function createWorkbenchComponentData(): WorkbenchComponentData {
   return {};
}