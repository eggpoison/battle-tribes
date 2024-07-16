import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";

class Barrel extends Entity {
   public static readonly SIZE = 80;

   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.barrel);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/barrel/barrel.png"),
            0,
            0
         )
      );

      const transformComponentData = componentDataRecord[ServerComponentType.transform]!;
      if (transformComponentData.ageTicks <= 0) {
         playSound("barrel-place.mp3", 0.4, 1, Point.unpackage(transformComponentData.position));
      }
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playBuildingHitSound(transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("building-destroy-1.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Barrel;