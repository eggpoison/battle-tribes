import { randItem } from "battletribes-shared/utils";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS, playSound } from "../sound";
import Entity from "../Entity";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, BALLISTA_GEAR_X, BALLISTA_GEAR_Y } from "../utils";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import { TransformComponentArray } from "../entity-components/TransformComponent";
import { getEntityRenderInfo } from "../world";

class Ballista extends Entity {
   constructor(id: number) {
      super(id);

      const renderInfo = getEntityRenderInfo(id);
      
      // Base
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/ballista/base.png")
         )
      );

      // Ammo box
      const ammoBoxRenderPart = new TexturedRenderPart(
         null,
         1,
         Math.PI / 2,
         getTextureArrayIndex("entities/ballista/ammo-box.png")
      );
      ammoBoxRenderPart.offset.x = BALLISTA_AMMO_BOX_OFFSET_X;
      ammoBoxRenderPart.offset.y = BALLISTA_AMMO_BOX_OFFSET_Y;
      renderInfo.attachRenderThing(ammoBoxRenderPart);

      // Plate
      const plateRenderPart = new TexturedRenderPart(
         null,
         2,
         0,
         getTextureArrayIndex("entities/ballista/plate.png")
      );
      plateRenderPart.addTag("turretComponent:pivoting");
      renderInfo.attachRenderThing(plateRenderPart);

      // Shaft
      const shaftRenderPart = new TexturedRenderPart(
         plateRenderPart,
         3,
         0,
         getTextureArrayIndex("entities/ballista/shaft.png")
      );
      renderInfo.attachRenderThing(shaftRenderPart);

      // Gears
      const gearRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const renderPart = new TexturedRenderPart(
            shaftRenderPart,
            2.5 + i * 0.1,
            0,
            getTextureArrayIndex("entities/ballista/gear.png")
         );
         renderPart.addTag("turretComponent:gear");
         // @Speed: Garbage collection
         renderPart.offset.x = i === 0 ? BALLISTA_GEAR_X : -BALLISTA_GEAR_X;
         renderPart.offset.y = BALLISTA_GEAR_Y;
         renderInfo.attachRenderThing(renderPart);
         gearRenderParts.push(renderPart);
      }

      // Crossbow
      const crossbowRenderPart = new TexturedRenderPart(
         shaftRenderPart,
         5,
         0,
         getTextureArrayIndex("entities/ballista/crossbow-1.png")
      );
      crossbowRenderPart.addTag("turretComponent:aiming");
      renderInfo.attachRenderThing(crossbowRenderPart);
   }

   protected onHit(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      
      // @Temporary
      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      
      // @Temporary
      playSound(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, transformComponent.position);
   }
}

export default Ballista;