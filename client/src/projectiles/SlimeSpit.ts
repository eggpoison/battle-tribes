import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import { createPoisonParticle } from "../particles";
import { TransformComponentArray } from "../entity-components/TransformComponent";
import { getEntityRenderInfo } from "../world";

class SlimeSpit extends Entity {
   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      
      const renderParts = new Array<RenderPart>();

      // @Incomplete: SIZE DOESN'T ACTUALLY AFFECT ANYTHING

      const renderPart1 = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("projectiles/slime-spit-medium.png")
      );
      renderPart1.opacity = 0.75;
      renderPart1.addTag("slimeSpit:part");
      renderInfo.attachRenderThing(renderPart1);
      renderParts.push(renderPart1);

      const renderPart2 = new TexturedRenderPart(
         null,
         0,
         Math.PI/4,
         getTextureArrayIndex("projectiles/slime-spit-medium.png")
      );
      renderPart2.addTag("slimeSpit:part");
      renderPart2.opacity = 0.75;
      renderInfo.attachRenderThing(renderPart2);
      renderParts.push(renderPart2);
   }

   public onLoad(): void {
      // @Hack
      const transformComponent = TransformComponentArray.getComponent(this.id);
      if (transformComponent.ageTicks <= 0) {
         playSound("slime-spit.mp3", 0.5, 1, transformComponent.position);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 15; i++) {
         createPoisonParticle(this.id);
      }
   }
}

export default SlimeSpit;