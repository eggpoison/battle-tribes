import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import { DOOR_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Door extends Entity {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.door);

      const buildingMaterialComponentData = componentDataRecord[ServerComponentType.buildingMaterial]!;

      const renderPart = new TexturedRenderPart(
         this,
         0,
         0,
         getTextureArrayIndex(DOOR_TEXTURE_SOURCES[buildingMaterialComponentData.material])
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
         const position = transformComponent.position.offset(20, 2 * Math.PI * Math.random());
         createLightWoodSpeckParticle(position.x, position.y, 5);
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

export default Door;