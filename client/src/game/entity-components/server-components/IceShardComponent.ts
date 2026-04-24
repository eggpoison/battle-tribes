import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface IceShardComponentData {}

export interface IceShardComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.iceShard, _IceShardComponentArray> {}
}

class _IceShardComponentArray extends _ServerComponentArray<IceShardComponent, IceShardComponentData> {
   public decodeData(): IceShardComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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
   }

   public createComponent() {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const IceShardComponentArray = registerServerComponentArray(ServerComponentType.iceShard, _IceShardComponentArray, true);