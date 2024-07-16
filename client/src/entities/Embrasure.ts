import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { angle } from "webgl-test-shared/dist/utils";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import { EMBRASURE_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";

class Embrasure extends Entity {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.embrasure);

      const buildingMaterialComponentData = componentDataRecord[ServerComponentType.buildingMaterial]!;

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(EMBRASURE_TEXTURE_SOURCES[buildingMaterialComponentData.material]),
         0,
         0
      );
      renderPart.addTag("buildingMaterialComponent:material");
      this.attachRenderPart(renderPart);
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

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
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

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