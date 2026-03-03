import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface BracingsComponentData {}

interface IntermediateInfo {}

export interface BracingsComponent {}

export const BracingsComponentArray = new ServerComponentArray<BracingsComponent, BracingsComponentData, IntermediateInfo>(ServerComponentType.bracings, true, createComponent, getMaxRenderParts, decodeData);
BracingsComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createBracingsComponentData(): BracingsComponentData {
   return {};
}

function decodeData(): BracingsComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;

   // Vertical posts
   for (const hitbox of transformComponentData.hitboxes) {
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/bracings/wooden-vertical-post.png")
      );
      renderPart.addTag("bracingsComponent:vertical");
      renderInfo.attachRenderPart(renderPart);
   }

   const hitbox = transformComponentData.hitboxes[0];

   // Horizontal bar connecting the vertical ones
   const horizontalBar = new TexturedRenderPart(
      hitbox,
      1,
      0,
      getTextureArrayIndex("entities/bracings/wooden-horizontal-post.png")
   );
   horizontalBar.addTag("bracingsComponent:horizontal");
   horizontalBar.opacity = 0.5;
   renderInfo.attachRenderPart(horizontalBar);

   return {};
}

function createComponent(): BracingsComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}