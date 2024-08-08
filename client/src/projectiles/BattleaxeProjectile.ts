import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class BattleaxeProjectile extends Entity {
   constructor(id: number) {
      super(id, EntityType.battleaxeProjectile);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex("items/large/stone-battleaxe.png")
         )
      );
   }
}

export default BattleaxeProjectile;