import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";

class WorkerHut extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.workerHut, ageTicks);

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
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }

   public updateFromData(data: EntityData<EntityType.warriorHut>): void {
      super.updateFromData(data);
   }
}

export default WorkerHut;