import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";

class WarriorHut extends Entity {
   constructor(id: number) {
      super(id);
      
      const renderInfo = getEntityRenderInfo(this.id);
      
      // Hut
      const hutRenderPart = new TexturedRenderPart(
         null,
         2,
         0,
         getTextureArrayIndex("entities/warrior-hut/warrior-hut.png")
      );
      renderInfo.attachRenderThing(hutRenderPart);

      // Doors
      const doorRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const doorRenderPart = new TexturedRenderPart(
            null,
            1,
            0,
            getTextureArrayIndex("entities/warrior-hut/warrior-hut-door.png")
         );
         doorRenderPart.addTag("hutComponent:door");
         renderInfo.attachRenderThing(doorRenderPart);
         doorRenderParts.push(doorRenderPart);
      }
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

export default WarriorHut;