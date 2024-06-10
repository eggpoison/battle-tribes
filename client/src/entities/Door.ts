import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import { DOOR_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";

class Door extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) {
      super(position, id, EntityType.door, ageTicks);

      const buildingMaterialComponentData = componentDataRecord[ServerComponentType.buildingMaterial]!;

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(DOOR_TEXTURE_SOURCES[buildingMaterialComponentData.material]),
         0,
         0
      );
      this.attachRenderPart(renderPart);
   }

   protected onHit(hitData: HitData): void {
      playSound("wooden-wall-hit.mp3", 0.3, 1, this.position.x, this.position.y);

      for (let i = 0; i < 4; i++) {
         createLightWoodSpeckParticle(this.position.x, this.position.y, 20);
      }

      for (let i = 0; i < 7; i++) {
         const position = this.position.offset(20, 2 * Math.PI * Math.random());
         createLightWoodSpeckParticle(position.x, position.y, 5);
      }
   }
   
   public onDie(): void {
      playSound("wooden-wall-break.mp3", 0.4, 1, this.position.x, this.position.y);

      for (let i = 0; i < 7; i++) {
         createLightWoodSpeckParticle(this.position.x, this.position.y, 32 * Math.random());
      }

      for (let i = 0; i < 3; i++) {
         createWoodShardParticle(this.position.x, this.position.y, 32);
      }
   }
}

export default Door;