import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { TransformComponentArray } from "../entity-components/TransformComponent";
import { getEntityRenderInfo } from "../world";

class Campfire extends Entity {
   public static readonly SIZE = 104;

   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/campfire/campfire.png")
         )
      );
   }

   public onLoad(): void {
      // @Hack
      const transformComponent = TransformComponentArray.getComponent(this.id);
      if (transformComponent.ageTicks <= 0) {
         playSound("wooden-wall-place.mp3", 0.3, 1, transformComponent.position);
      }
   }
}

export default Campfire;