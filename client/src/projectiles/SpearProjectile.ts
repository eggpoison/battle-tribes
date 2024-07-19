import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class SpearProjectile extends Entity {
   constructor(id: number) {
      super(id, EntityType.spearProjectile);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex("items/misc/spear.png")
         )
      );
   }

   public onLoad(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      if (transformComponent.ageTicks <= 0) {
         playSound("spear-throw.mp3", 0.4, 1, transformComponent.position);
      }
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("spear-hit.mp3", 0.4, 1, transformComponent.position);
   }
}

export default SpearProjectile;