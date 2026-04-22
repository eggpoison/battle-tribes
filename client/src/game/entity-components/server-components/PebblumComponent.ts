import { randAngle, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface PebblumComponentData {}

export interface PebblumComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.pebblum, _PebblumComponentArray, PebblumComponentData> {}
}

class _PebblumComponentArray extends _ServerComponentArray<PebblumComponent, PebblumComponentData> {
   public decodeData(): PebblumComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      // Nose
      const nose = new TexturedRenderPart(
         hitbox,
         0,
         randAngle(),
         0, 12,
         getTextureArrayIndex("entities/pebblum/pebblum-nose.png")
      )
      renderObject.attachRenderPart(nose);

      // Body
      const body = new TexturedRenderPart(
         hitbox,
         1,
         randAngle(),
         0, -8,
         getTextureArrayIndex("entities/pebblum/pebblum-body.png")
      )
      renderObject.attachRenderPart(body);
   }

   public createComponent(): PebblumComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 2;
   }
}

export const PebblumComponentArray = registerServerComponentArray(ServerComponentType.pebblum, _PebblumComponentArray, true);