import { EntityType } from "battletribes-shared/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class BattleaxeProjectile extends Entity {
   constructor(id: number) {
      super(id);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("items/large/stone-battleaxe.png")
         )
      );
   }
}

export default BattleaxeProjectile;