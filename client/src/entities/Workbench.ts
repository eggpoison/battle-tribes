import { EntityType } from "battletribes-shared/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Workbench extends Entity {
   public static readonly SIZE = 80;
   
   constructor(id: number) {
      super(id, EntityType.workbench);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/workbench/workbench.png")
         )
      );
   }
}

export default Workbench;