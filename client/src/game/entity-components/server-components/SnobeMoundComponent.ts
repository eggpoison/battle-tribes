import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface SnobeMoundComponentData {}

export interface SnobeMoundComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.snobeMound, _SnobeMoundComponentArray, SnobeMoundComponentData> {}
}

class _SnobeMoundComponentArray extends _ServerComponentArray<SnobeMoundComponent, SnobeMoundComponentData> {
   public decodeData(): SnobeMoundComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            1,
            0,
            0, 0,
            getTextureArrayIndex("entities/snobe-mound/snobe-mound.png")
         )
      );
   }

   public createComponent(): SnobeMoundComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const SnobeMoundComponentArray = registerServerComponentArray(ServerComponentType.snobeMound, _SnobeMoundComponentArray, true);