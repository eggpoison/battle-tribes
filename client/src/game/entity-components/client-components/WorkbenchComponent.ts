import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface WorkbenchComponentData {}

export interface WorkbenchComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.workbench, _WorkbenchComponentArray> {}
}

class _WorkbenchComponentArray extends ClientComponentArray<WorkbenchComponent, WorkbenchComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            TextureIndex.entities_workbench_workbench
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