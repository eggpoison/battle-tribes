import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { FLOOR_SPIKE_TEXTURE_SOURCES, WALL_SPIKE_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";

class Spikes extends Entity {
   constructor(position: Point, id: number, ageTicks: number, entityType: EntityType, componentDataRecord: ComponentDataRecord) {
      super(position, id, entityType, ageTicks);

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
      this.attachRenderPart(mainRenderPart);
      
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