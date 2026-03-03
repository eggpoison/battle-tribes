import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface ThrownBattleaxeComponentData {}

interface IntermediateInfo {}

export interface ThrownBattleaxeComponent {}

export const ThrownBattleaxeComponentArray = new ClientComponentArray<ThrownBattleaxeComponent, IntermediateInfo>(ClientComponentType.thrownBattleaxe, true, createComponent, getMaxRenderParts);
ThrownBattleaxeComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createThrownBattleaxeComponentData(): ThrownBattleaxeComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("items/large/stone-battleaxe.png")
      )
   );

   return {};
}

function createComponent(): ThrownBattleaxeComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}