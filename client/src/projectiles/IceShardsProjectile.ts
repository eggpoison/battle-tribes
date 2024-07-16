import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class IceShardsProjectile extends Entity {
   constructor(id: number) {
      super(id, EntityType.iceShardProjectile);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex("projectiles/ice-shard.png")
         )
      );
   }
}

export default IceShardsProjectile;