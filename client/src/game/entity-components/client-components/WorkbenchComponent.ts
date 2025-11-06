import { ServerComponentType } from "webgl-test-shared";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface WorkbenchComponentData {}

interface IntermediateInfo {}

export interface WorkbenchComponent {}

export const WorkbenchComponentArray = new ClientComponentArray<WorkbenchComponent, IntermediateInfo>(ClientComponentType.workbench, true, createComponent, getMaxRenderParts);
WorkbenchComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createWorkbenchComponentData(): WorkbenchComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/workbench/workbench.png")
      )
   );

   return {};
}

function createComponent(): WorkbenchComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}