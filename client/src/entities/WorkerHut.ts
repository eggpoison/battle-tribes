import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playBuildingHitSound, playSound } from "../sound";
import TribeComponent from "../entity-components/TribeComponent";
import HutComponent from "../entity-components/HutComponent";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";

class WorkerHut extends Entity {
   public static readonly SIZE = 88;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.workerHut>) {
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
      this.attachRenderPart(doorRenderPart);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]))
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]))
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[2]))
      this.addServerComponent(ServerComponentType.hut, new HutComponent(this, componentsData[3], [doorRenderPart]))
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