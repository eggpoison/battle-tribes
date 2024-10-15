import { EntityType } from "battletribes-shared/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity from "../Entity";
import { BuildingMaterialComponentArray, FLOOR_SPIKE_TEXTURE_SOURCES, WALL_SPIKE_TEXTURE_SOURCES } from "../entity-components/server-components/BuildingMaterialComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo, getEntityType } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";

// @Cleanup: split into floor spikes and wall spikes
class Spikes extends Entity {
   constructor(id: number) {
      super(id);
   }

   public onLoad(): void {
      const materialComponent = BuildingMaterialComponentArray.getComponent(this.id);

      const isAttachedToWall = getEntityType(this.id) === EntityType.wallSpikes;
      let textureArrayIndex: number;
      if (isAttachedToWall) {
         textureArrayIndex = getTextureArrayIndex(WALL_SPIKE_TEXTURE_SOURCES[materialComponent.material]);
      } else {
         textureArrayIndex = getTextureArrayIndex(FLOOR_SPIKE_TEXTURE_SOURCES[materialComponent.material]);
      }

      const mainRenderPart = new TexturedRenderPart(
         null,
         0,
         0,
         textureArrayIndex
      )
      mainRenderPart.addTag("buildingMaterialComponent:material");

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(mainRenderPart);
   }

   protected onHit(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound("wooden-spikes-hit.mp3", 0.2, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Spikes;