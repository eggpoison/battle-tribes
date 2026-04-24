import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";

export interface ThrownBattleaxeComponentData {}

export interface ThrownBattleaxeComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.thrownBattleaxe, _ThrownBattleaxeComponentArray> {}
}

class _ThrownBattleaxeComponentArray extends _ClientComponentArray<ThrownBattleaxeComponent, ThrownBattleaxeComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("items/large/stone-battleaxe.png")
         )
      );
   }

   public createComponent(): ThrownBattleaxeComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const ThrownBattleaxeComponentArray = registerClientComponentArray(ClientComponentType.thrownBattleaxe, _ThrownBattleaxeComponentArray, true);

export function createThrownBattleaxeComponentData(): ThrownBattleaxeComponentData {
   return {};
}