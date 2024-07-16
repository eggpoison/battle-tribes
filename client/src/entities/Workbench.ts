import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";

class Workbench extends Entity {
   public static readonly SIZE = 80;
   
   constructor(id: number) {
      super(id, EntityType.workbench);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/workbench/workbench.png"),
            0,
            0
         )
      );
   }
}

export default Workbench;