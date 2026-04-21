import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface MithrilAnvilComponentData {}

export interface MithrilAnvilComponent {}

class _MithrilAnvilComponentArray extends ServerComponentArray<MithrilAnvilComponent, MithrilAnvilComponentData> {
   public decodeData(): MithrilAnvilComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/mithril-anvil/mithril-anvil.png")
      );
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): MithrilAnvilComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const MithrilAnvilComponentArray = registerServerComponentArray(ServerComponentType.mithrilAnvil, _MithrilAnvilComponentArray, true);

export function createMithrilAnvilComponentData(): MithrilAnvilComponentData {
   return {};
}