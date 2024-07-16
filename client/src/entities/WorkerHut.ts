import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class WorkerHut extends Entity {
   constructor(id: number) {
      super(id, EntityType.workerHut);

      // Hut
      const hutRenderPart = new TexturedRenderPart(
         this,
         2,
         0,
         getTextureArrayIndex("entities/worker-hut/worker-hut.png")
      );
      this.attachRenderPart(hutRenderPart);

      // Door
      const doorRenderPart = new TexturedRenderPart(
         this,
         1,
         0,
         getTextureArrayIndex("entities/worker-hut/worker-hut-door.png")
      );
      doorRenderPart.addTag("hutComponent:door");
      this.attachRenderPart(doorRenderPart);
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

export default WorkerHut;