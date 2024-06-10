import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";

class SlingTurret extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.slingTurret, ageTicks);

      // Base
      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/sling-turret/sling-turret-base.png"),
            0,
            0
         )
      );

      // Plate
      const plateRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/sling-turret/sling-turret-plate.png"),
         1,
         0
      );
      plateRenderPart.addTag("turretComponent:pivoting");
      this.attachRenderPart(plateRenderPart);

      // Sling
      const slingRenderPart = new RenderPart(
         plateRenderPart,
         getTextureArrayIndex("entities/sling-turret/sling-turret-sling.png"),
         2,
         0
      );
      slingRenderPart.addTag("turretComponent:aiming");
      this.attachRenderPart(slingRenderPart);
   }
}

export default SlingTurret;