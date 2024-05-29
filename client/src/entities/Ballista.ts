import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randItem } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS, playSound } from "../sound";
import Entity from "../Entity";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, BALLISTA_GEAR_X, BALLISTA_GEAR_Y } from "../utils";

class Ballista extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.ballista, ageTicks);

      // Base
      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/ballista/base.png"),
            0,
            0
         )
      );

      // Ammo box
      const ammoBoxRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/ballista/ammo-box.png"),
         1,
         Math.PI / 2
      );
      ammoBoxRenderPart.offset.x = BALLISTA_AMMO_BOX_OFFSET_X;
      ammoBoxRenderPart.offset.y = BALLISTA_AMMO_BOX_OFFSET_Y;
      this.attachRenderPart(ammoBoxRenderPart);

      // Plate
      const plateRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/ballista/plate.png"),
         2,
         0
      );
      plateRenderPart.addTag("turretComponent:pivoting");
      this.attachRenderPart(plateRenderPart);

      // Shaft
      const shaftRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/ballista/shaft.png"),
         3,
         0
      );
      this.attachRenderPart(shaftRenderPart);

      // Gears
      const gearRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const renderPart = new RenderPart(
            shaftRenderPart,
            getTextureArrayIndex("entities/ballista/gear.png"),
            2.5 + i * 0.1,
            0
         );
         renderPart.addTag("turretComponent:gear");
         // @Speed: Garbage collection
         renderPart.offset.x = i === 0 ? BALLISTA_GEAR_X : -BALLISTA_GEAR_X;
         renderPart.offset.y = BALLISTA_GEAR_Y;
         this.attachRenderPart(renderPart);
         gearRenderParts.push(renderPart);
      }

      // Crossbow
      const crossbowRenderPart = new RenderPart(
         shaftRenderPart,
         getTextureArrayIndex("entities/ballista/crossbow-1.png"),
         5,
         0
      );
      crossbowRenderPart.addTag("turretComponent:aiming");
      this.attachRenderPart(crossbowRenderPart);
   }

   protected onHit(): void {
      // @Temporary
      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      // @Temporary
      playSound(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, this.position.x, this.position.y);
   }
}

export default Ballista;