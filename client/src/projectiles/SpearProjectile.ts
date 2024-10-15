import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { getEntityRenderInfo } from "../world";

class SpearProjectile extends Entity {
   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("items/misc/spear.png")
         )
      );
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound("spear-hit.mp3", 0.4, 1, transformComponent.position);
   }
}

export default SpearProjectile;