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
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.workbench, typeof WorkbenchComponentArray> {}
}

export const WorkbenchComponentArray = registerClientComponentArray(
   ClientComponentType.workbench,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
WorkbenchComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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

function createComponent(): WorkbenchComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

export function createWorkbenchComponentData(): WorkbenchComponentData {
   return {};
}