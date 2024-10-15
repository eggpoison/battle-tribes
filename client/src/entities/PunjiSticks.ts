import { EntityType } from "battletribes-shared/entities";
import { playSound } from "../sound";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { getEntityRenderInfo, getEntityType } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";

class PunjiSticks extends Entity {
   constructor(id: number) {
      super(id);
   }

   public onLoad(): void {
      const isAttachedToWall = getEntityType(this.id) === EntityType.wallPunjiSticks;
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
      );
      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(renderPart);
   }

   protected onHit(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound("wooden-spikes-hit.mp3", 0.3, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, transformComponent.position);
   }
}

export default PunjiSticks;