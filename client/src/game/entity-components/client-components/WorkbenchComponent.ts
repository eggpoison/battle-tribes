import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerClientComponentArray } from "../component-register";

export interface WorkbenchComponentData {}

export interface WorkbenchComponent {}

class _WorkbenchComponentArray extends ClientComponentArray<WorkbenchComponent> {
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