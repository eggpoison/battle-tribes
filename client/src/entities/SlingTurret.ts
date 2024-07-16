import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class SlingTurret extends Entity {
   constructor(id: number) {
      super(id, EntityType.slingTurret);

      // Base
      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex("entities/sling-turret/sling-turret-base.png")
         )
      );

      // Plate
      const plateRenderPart = new TexturedRenderPart(
         this,
         1,
         0,
         getTextureArrayIndex("entities/sling-turret/sling-turret-plate.png")
      );
      plateRenderPart.addTag("turretComponent:pivoting");
      this.attachRenderPart(plateRenderPart);

      // Sling
      const slingRenderPart = new TexturedRenderPart(
         plateRenderPart,
         2,
         0,
         getTextureArrayIndex("entities/sling-turret/sling-turret-sling.png")
      );
      slingRenderPart.addTag("turretComponent:aiming");
      this.attachRenderPart(slingRenderPart);
   }
}

export default SlingTurret;