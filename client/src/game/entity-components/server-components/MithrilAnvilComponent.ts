import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface MithrilAnvilComponentData {}

export interface MithrilAnvilComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.mithrilAnvil, _MithrilAnvilComponentArray> {}
}

class _MithrilAnvilComponentArray extends _ServerComponentArray<MithrilAnvilComponent, MithrilAnvilComponentData> {
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