import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { randFloat } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { getHitboxTag } from "../../hitboxes";
import { TextureIndex } from "../../../texture-index";

export interface RiverSteppingStoneComponentData {}

export interface RiverSteppingStoneComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.riverSteppingStone, typeof RiverSteppingStoneComponentArray> {}
}

export const RiverSteppingStoneComponentArray = registerServerComponentArray(
   ServerComponentType.riverSteppingStone,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
RiverSteppingStoneComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): RiverSteppingStoneComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const tag = getHitboxTag(hitbox);
   
   let textureIndex: TextureIndex;
   if (tag === HitboxTag.riverSteppingStoneSmall) {
      textureIndex = TextureIndex.entities_riverSteppingStone_stoneSmall;
   } else if (tag === HitboxTag.riverSteppingStoneMedium) {
      textureIndex = TextureIndex.entities_riverSteppingStone_stoneMedium;
   } else {
      textureIndex = TextureIndex.entities_riverSteppingStone_stoneLarge;
   }
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      textureIndex
   );
   renderPart.tintR = randFloat(-0.03, 0.03);
   renderPart.tintG = randFloat(-0.03, 0.03);
   renderPart.tintB = randFloat(-0.03, 0.03);
   renderObject.attachRenderPart(renderPart)
}

function createComponent(): RiverSteppingStoneComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}