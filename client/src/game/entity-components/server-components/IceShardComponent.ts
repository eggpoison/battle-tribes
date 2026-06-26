import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface IceShardComponentData {}

export interface IceShardComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.iceShard, typeof IceShardComponentArray> {}
}

export const IceShardComponentArray = registerServerComponentArray(
   ServerComponentType.iceShard,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
IceShardComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): IceShardComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponent.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.projectiles_iceShard
      )
   );
}

function createComponent() {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}