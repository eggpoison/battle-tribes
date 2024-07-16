import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";

class WarriorHut extends Entity {
   constructor(id: number) {
      super(id, EntityType.warriorHut);
      
      // Hut
      const hutRenderPart = new TexturedRenderPart(
         this,
         2,
         0,
         getTextureArrayIndex("entities/warrior-hut/warrior-hut.png")
      );
      this.attachRenderPart(hutRenderPart);

      // Doors
      const doorRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const doorRenderPart = new TexturedRenderPart(
            this,
            1,
            0,
            getTextureArrayIndex("entities/warrior-hut/warrior-hut-door.png")
         );
         doorRenderPart.addTag("hutComponent:door");
         this.attachRenderPart(doorRenderPart);
         doorRenderParts.push(doorRenderPart);
      }
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playBuildingHitSound(transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("building-destroy-1.mp3", 0.4, 1, transformComponent.position);
   }
}

export default WarriorHut;