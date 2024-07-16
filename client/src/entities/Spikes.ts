import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { FLOOR_SPIKE_TEXTURE_SOURCES, WALL_SPIKE_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import { Point } from "webgl-test-shared/dist/utils";

class Spikes extends Entity {
   constructor(id: number, entityType: EntityType, componentDataRecord: ComponentDataRecord) {
      super(id, entityType);

      const materialComponentData = componentDataRecord[ServerComponentType.buildingMaterial]!;

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
      mainRenderPart.addTag("buildingMaterialComponent:material");
      this.attachRenderPart(mainRenderPart);
      
      const transformComponentData = componentDataRecord[ServerComponentType.transform]!;
      if (transformComponentData.ageTicks <= 0) {
         playSound("spike-place.mp3", 0.5, 1, Point.unpackage(transformComponentData.position));
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