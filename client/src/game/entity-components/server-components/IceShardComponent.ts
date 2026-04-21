import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";

export interface IceShardComponentData {}

interface IntermediateInfo {}

export interface IceShardComponent {}

export const IceShardComponentArray = new ServerComponentArray<IceShardComponent, IceShardComponentData, IntermediateInfo>(ServerComponentType.iceShard, true, createComponent, getMaxRenderParts, decodeData);
IceShardComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): IceShardComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IceShardComponent {
   const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponent.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
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