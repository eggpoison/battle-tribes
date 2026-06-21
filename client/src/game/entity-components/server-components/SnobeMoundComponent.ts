import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface SnobeMoundComponentData {}

export interface SnobeMoundComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.snobeMound, _SnobeMoundComponentArray> {}
}

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
            TextureIndex.entities_snobeMound_snobeMound
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