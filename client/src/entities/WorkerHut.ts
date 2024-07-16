import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class WorkerHut extends Entity {
   constructor(id: number) {
      super(id, EntityType.workerHut);

      // Hut
      const hutRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/worker-hut/worker-hut.png"),
         2,
         0
      );
      this.attachRenderPart(hutRenderPart);

      // Door
      const doorRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/worker-hut/worker-hut-door.png"),
         1,
         0
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