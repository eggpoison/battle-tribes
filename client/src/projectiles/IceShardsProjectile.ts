import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";

class IceShardsProjectile extends Entity {
   constructor(id: number) {
      super(id, EntityType.iceShardProjectile);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("projectiles/ice-shard.png"),
            0,
            0
         )
      );
   }
}

export default IceShardsProjectile;