import { EntityType } from "webgl-test-shared/dist/entities";
import { playSound } from "../sound";
import Entity from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

class PunjiSticks extends Entity {
   constructor(id: number, entityType: EntityType) {
      super(id, entityType);
   }

   public onLoad(): void {
      const isAttachedToWall = this.type === EntityType.wallPunjiSticks;
      let textureArrayIndex: number;
      if (isAttachedToWall) {
         textureArrayIndex = getTextureArrayIndex("entities/wall-punji-sticks/wall-punji-sticks.png");
      } else {
         textureArrayIndex = getTextureArrayIndex("entities/floor-punji-sticks/floor-punji-sticks.png");
      }

      const renderPart = new TexturedRenderPart(
         null,
         0,
         0,
         textureArrayIndex
      )
      this.attachRenderThing(renderPart);

      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      if (transformComponent.ageTicks <= 0) {
         playSound("spike-place.mp3", 0.5, 1, transformComponent.position);
      }
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("wooden-spikes-hit.mp3", 0.3, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, transformComponent.position);
   }
}

export default PunjiSticks;