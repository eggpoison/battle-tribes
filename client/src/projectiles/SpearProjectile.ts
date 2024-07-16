import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity, { ComponentDataRecord } from "../Entity";
import { playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";

class SpearProjectile extends Entity {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.spearProjectile);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("items/misc/spear.png"),
            0,
            0
         )
      );

      const transformComponentData = componentDataRecord[ServerComponentType.transform]!;
      if (transformComponentData.ageTicks <= 0) {
         playSound("spear-throw.mp3", 0.4, 1, Point.unpackage(transformComponentData.position));
      }
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("spear-hit.mp3", 0.4, 1, transformComponent.position);
   }
}

export default SpearProjectile;