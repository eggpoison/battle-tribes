import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";

class Barrel extends Entity {
   public static readonly SIZE = 80;

   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/barrel/barrel.png")
         )
      );
   }

   protected onHit(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playBuildingHitSound(transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound("building-destroy-1.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Barrel;