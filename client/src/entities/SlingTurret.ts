import { EntityType } from "battletribes-shared/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class SlingTurret extends Entity {
   constructor(id: number) {
      super(id);

      // Base
      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/sling-turret/sling-turret-base.png")
         )
      );

      // Plate
      const plateRenderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex("entities/sling-turret/sling-turret-plate.png")
      );
      plateRenderPart.addTag("turretComponent:pivoting");
      this.attachRenderThing(plateRenderPart);

      // Sling
      const slingRenderPart = new TexturedRenderPart(
         plateRenderPart,
         2,
         0,
         getTextureArrayIndex("entities/sling-turret/sling-turret-sling.png")
      );
      slingRenderPart.addTag("turretComponent:aiming");
      this.attachRenderThing(slingRenderPart);
   }
}

export default SlingTurret;