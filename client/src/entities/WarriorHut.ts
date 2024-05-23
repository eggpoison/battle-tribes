import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playBuildingHitSound, playSound } from "../sound";
import HutComponent from "../entity-components/HutComponent";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import StructureComponent from "../entity-components/StructureComponent";

class WarriorHut extends Entity {
   public static readonly SIZE = 104;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.warriorHut>) {
      super(position, id, EntityType.warriorHut, ageTicks);
      
      // Hut
      const hutRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/warrior-hut/warrior-hut.png"),
         2,
         0
      );
      this.attachRenderPart(hutRenderPart);

      // Doors
      const doorRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const doorRenderPart = new RenderPart(
            this,
            getTextureArrayIndex("entities/warrior-hut/warrior-hut-door.png"),
            1,
            0
         );
         this.attachRenderPart(doorRenderPart);
         doorRenderParts.push(doorRenderPart);
      }

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.structure, new StructureComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.hut, new HutComponent(this, componentsData[4], doorRenderParts));
   }

   protected onHit(): void {
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default WarriorHut;