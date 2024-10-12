import { HitData } from "battletribes-shared/client-server-types";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import { BuildingMaterialComponentArray, DOOR_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/TransformComponent";

class Door extends Entity {
   constructor(id: number) {
      super(id);
   }

   public onLoad(): void {
      const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(this.id);

      const renderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(DOOR_TEXTURE_SOURCES[buildingMaterialComponent.material])
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
         const position = transformComponent.position.offset(20, 2 * Math.PI * Math.random());
         createLightWoodSpeckParticle(position.x, position.y, 5);
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

export default Door;