import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity from "../Entity";
import { FLOOR_SPIKE_TEXTURE_SOURCES, WALL_SPIKE_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

// @Cleanup: split into floor spikes and wall spikes
class Spikes extends Entity {
   constructor(id: number, entityType: EntityType) {
      super(id, entityType);
   }

   public onLoad(): void {
      const materialComponent = this.getServerComponent(ServerComponentType.buildingMaterial);

      const isAttachedToWall = this.type === EntityType.wallSpikes;
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
      this.attachRenderThing(mainRenderPart);
      
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      if (transformComponent.ageTicks <= 0) {
         playSound("spike-place.mp3", 0.5, 1, transformComponent.position);
      }
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("wooden-spikes-hit.mp3", 0.2, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Spikes;