import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity, { ComponentDataRecord } from "../Entity";
import { playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";

class PlanterBox extends Entity {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.planterBox);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/planter-box/planter-box.png"),
            0,
            0
         )
      );

      const transformComponentData = componentDataRecord[ServerComponentType.transform]!;
      if (transformComponentData.ageTicks <= 0) {
         playSound("wooden-wall-place.mp3", 0.3, 1, Point.unpackage(transformComponentData.position));
      }
   }
}

export default PlanterBox;