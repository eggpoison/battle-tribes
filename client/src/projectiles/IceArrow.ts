import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class IceArrow extends Entity {
   constructor(id: number) {
      super(id, EntityType.iceArrow);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("projectiles/ice-arrow.png")
         )
      );
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("arrow-hit.mp3", 0.4, 1, transformComponent.position);
   }
}

export default IceArrow;