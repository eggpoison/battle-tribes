import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface BracingsComponentData {}

export interface BracingsComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.bracings, typeof BracingsComponentArray> {}
}

export const BracingsComponentArray = registerServerComponentArray(
   ServerComponentType.bracings,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
BracingsComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createBracingsComponentData(): BracingsComponentData {
   return {};
}

function decodeData(): BracingsComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

   // Vertical posts
   for (const hitbox of transformComponentData.hitboxes) {
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.entities_bracings_woodenVerticalPost
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
      TextureIndex.entities_bracings_woodenHorizontalPost
   );
   addRenderPartTag(horizontalBar, "bracingsComponent:horizontal");
   horizontalBar.opacity = 0.5;
   renderObject.attachRenderPart(horizontalBar);
}

function createComponent(): BracingsComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}