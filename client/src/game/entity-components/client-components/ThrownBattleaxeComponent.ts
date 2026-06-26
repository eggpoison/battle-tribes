import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface ThrownBattleaxeComponentData {}

export interface ThrownBattleaxeComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.thrownBattleaxe, typeof ThrownBattleaxeComponentArray> {}
}

export const ThrownBattleaxeComponentArray = registerClientComponentArray(
   ClientComponentType.thrownBattleaxe,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
ThrownBattleaxeComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.items_large_stoneBattleaxe
      )
   );
}

function createComponent(): ThrownBattleaxeComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

export function createThrownBattleaxeComponentData(): ThrownBattleaxeComponentData {
   return {};
}