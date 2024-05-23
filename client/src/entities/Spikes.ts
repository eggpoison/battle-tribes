import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import BuildingMaterialComponent, { FLOOR_SPIKE_TEXTURE_SOURCES, WALL_SPIKE_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import SpikesComponent from "../entity-components/SpikesComponent";
import TribeComponent from "../entity-components/TribeComponent";
import StructureComponent from "../entity-components/StructureComponent";

class Spikes extends Entity {
   constructor(position: Point, id: number, ageTicks: number, entityType: EntityType, componentsData: EntityComponentsData<EntityType.floorSpikes>) {
      super(position, id, entityType, ageTicks);

      const materialComponentData = componentsData[5];

      const isAttachedToWall = entityType === EntityType.wallSpikes;
      let textureArrayIndex: number;
      if (isAttachedToWall) {
         textureArrayIndex = getTextureArrayIndex(WALL_SPIKE_TEXTURE_SOURCES[materialComponentData.material]);
      } else {
         textureArrayIndex = getTextureArrayIndex(FLOOR_SPIKE_TEXTURE_SOURCES[materialComponentData.material]);
      }

      const mainRenderPart = new RenderPart(
         this,
         textureArrayIndex,
         0,
         0
      )
      this.attachRenderPart(mainRenderPart);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.structure, new StructureComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.spikes, new SpikesComponent(this, componentsData[4], mainRenderPart));
      this.addServerComponent(ServerComponentType.buildingMaterial, new BuildingMaterialComponent(this, materialComponentData, mainRenderPart));
      
      if (ageTicks <= 1) {
         playSound("spike-place.mp3", 0.5, 1, this.position.x, this.position.y);
      }
   }

   protected onHit(): void {
      playSound("wooden-spikes-hit.mp3", 0.2, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Spikes;