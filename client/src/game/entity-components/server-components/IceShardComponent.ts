import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface IceShardComponentData {}

interface IntermediateInfo {}

export interface IceShardComponent {}

export const IceShardComponentArray = new ServerComponentArray<IceShardComponent, IceShardComponentData, IntermediateInfo>(ServerComponentType.iceShard, true, createComponent, getMaxRenderParts, decodeData);
IceShardComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): IceShardComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IceShardComponent {
   const transformComponent = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponent.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("projectiles/ice-shard.png")
      )
   );

   return {};
}

function createComponent() {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}