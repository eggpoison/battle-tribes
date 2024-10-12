import { angle } from "battletribes-shared/utils";
import { HitData } from "battletribes-shared/client-server-types";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import { BuildingMaterialComponentArray, EMBRASURE_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/TransformComponent";

class Embrasure extends Entity {
   constructor(id: number) {
      super(id);
   }

   public onLoad(): void {
      const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(this.id);

      const renderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(EMBRASURE_TEXTURE_SOURCES[buildingMaterialComponent.material])
      );
      renderPart.addTag("buildingMaterialComponent:material");

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(renderPart);
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      playSound("wooden-wall-hit.mp3", 0.3, 1, transformComponent.position);

      for (let i = 0; i < 4; i++) {
         createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 20);
      }

      for (let i = 0; i < 7; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + 20 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + 20 * Math.cos(offsetDirection);
         createLightWoodSpeckParticle(spawnPositionX, spawnPositionY, 5);
      }
   }
   
   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      playSound("wooden-wall-break.mp3", 0.4, 1, transformComponent.position);

      for (let i = 0; i < 7; i++) {
         createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 32 * Math.random());
      }

      for (let i = 0; i < 3; i++) {
         createWoodShardParticle(transformComponent.position.x, transformComponent.position.y, 32);
      }
   }
}

export default Embrasure;