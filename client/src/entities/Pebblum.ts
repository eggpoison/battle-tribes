import { EntityType } from "battletribes-shared/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent, { FootprintComponentArray } from "../entity-components/server-components/FootprintComponent";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";

class Pebblum extends Entity {
   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(this.id);
      
      // Nose
      const nose = new TexturedRenderPart(
         null,
         0,
         2 * Math.PI * Math.random(),
         getTextureArrayIndex("entities/pebblum/pebblum-nose.png")
      )
      nose.offset.y = 12;
      renderInfo.attachRenderThing(nose);

      // Body
      const body = new TexturedRenderPart(
         null,
         1,
         2 * Math.PI * Math.random(),
         getTextureArrayIndex("entities/pebblum/pebblum-body.png")
      )
      body.offset.y = -8;
      renderInfo.attachRenderThing(body);

      FootprintComponentArray.addComponent(this.id, new FootprintComponent(this, 0.3, 20, 64, 5, 40));
   }
}

export default Pebblum;