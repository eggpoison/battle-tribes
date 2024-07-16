import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Pebblum extends Entity {
   constructor(id: number) {
      super(id, EntityType.pebblum);

      // Nose
      const nose = new TexturedRenderPart(
         this,
         0,
         2 * Math.PI * Math.random(),
         getTextureArrayIndex("entities/pebblum/pebblum-nose.png")
      )
      nose.offset.y = 12;
      this.attachRenderPart(nose);

      // Body
      const body = new TexturedRenderPart(
         this,
         1,
         2 * Math.PI * Math.random(),
         getTextureArrayIndex("entities/pebblum/pebblum-body.png")
      )
      body.offset.y = -8;
      this.attachRenderPart(body);

      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.3, 20, 64, 5, 40));
   }
}

export default Pebblum;