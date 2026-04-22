import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";

export interface BracingsComponentData {}

export interface BracingsComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.bracings, _BracingsComponentArray, BracingsComponentData> {}
}

class _BracingsComponentArray extends _ServerComponentArray<BracingsComponent, BracingsComponentData> {
   public decodeData(): BracingsComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

      // Vertical posts
      for (const hitbox of transformComponentData.hitboxes) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/bracings/wooden-vertical-post.png")
         );
         addRenderPartTag(renderPart, "bracingsComponent:vertical");
         renderObject.attachRenderPart(renderPart);
      }

      const hitbox = transformComponentData.hitboxes[0];

      // Horizontal bar connecting the vertical ones
      const horizontalBar = new TexturedRenderPart(
         hitbox,
         1,
         0,
         0, 0,
         getTextureArrayIndex("entities/bracings/wooden-horizontal-post.png")
      );
      addRenderPartTag(horizontalBar, "bracingsComponent:horizontal");
      horizontalBar.opacity = 0.5;
      renderObject.attachRenderPart(horizontalBar);
   }

   public createComponent(): BracingsComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 3;
   }
}

export const BracingsComponentArray = registerServerComponentArray(ServerComponentType.bracings, _BracingsComponentArray, true);

export function createBracingsComponentData(): BracingsComponentData {
   return {};
}