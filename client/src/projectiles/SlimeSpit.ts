import { EntityType } from "battletribes-shared/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import { ServerComponentType } from "battletribes-shared/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import { createPoisonParticle } from "../particles";

class SlimeSpit extends Entity {
   constructor(id: number) {
      super(id, EntityType.slimeSpit);

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
      this.attachRenderThing(renderPart1);
      renderParts.push(renderPart1);

      const renderPart2 = new TexturedRenderPart(
         null,
         0,
         Math.PI/4,
         getTextureArrayIndex("projectiles/slime-spit-medium.png")
      );
      renderPart2.addTag("slimeSpit:part");
      renderPart2.opacity = 0.75;
      this.attachRenderThing(renderPart2);
      renderParts.push(renderPart2);
   }

   public onLoad(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      if (transformComponent.ageTicks <= 0) {
         playSound("slime-spit.mp3", 0.5, 1, transformComponent.position);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 15; i++) {
         createPoisonParticle(this);
      }
   }
}

export default SlimeSpit;