import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface SnobeMoundComponentData {}

export interface SnobeMoundComponent {}

class _SnobeMoundComponentArray extends ServerComponentArray<SnobeMoundComponent, SnobeMoundComponentData> {
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