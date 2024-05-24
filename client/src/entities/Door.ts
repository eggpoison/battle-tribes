import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import DoorComponent from "../entity-components/DoorComponent";
import Entity from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import BuildingMaterialComponent, { DOOR_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import StructureComponent from "../entity-components/StructureComponent";

class Door extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.door>) {
      super(position, id, EntityType.door, ageTicks);

      const buildingMaterialComponentData = componentsData[5];

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(DOOR_TEXTURE_SOURCES[buildingMaterialComponentData.material]),
         0,
         0
      );
      this.attachRenderPart(renderPart);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.door, new DoorComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.structure, new StructureComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[4]));
      this.addServerComponent(ServerComponentType.buildingMaterial, new BuildingMaterialComponent(this, componentsData[5], renderPart));
   }

   protected onHit(hitData: HitData): void {
      playSound("wooden-wall-hit.mp3", 0.3, 1, this.position.x, this.position.y);

      for (let i = 0; i < 4; i++) {
         createLightWoodSpeckParticle(this.position.x, this.position.y, 20);
      }

      for (let i = 0; i < 7; i++) {
         const position = this.position.offset(20, 2 * Math.PI * Math.random());
         createLightWoodSpeckParticle(position.x, position.y, 5);
      }
   }
   
   public onDie(): void {
      playSound("wooden-wall-break.mp3", 0.4, 1, this.position.x, this.position.y);

      for (let i = 0; i < 7; i++) {
         createLightWoodSpeckParticle(this.position.x, this.position.y, 32 * Math.random());
      }

      for (let i = 0; i < 3; i++) {
         createWoodShardParticle(this.position.x, this.position.y, 32);
      }
   }
}

export default Door;