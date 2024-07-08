import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";

class Barrel extends Entity {
   public static readonly SIZE = 80;

   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.barrel, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/barrel/barrel.png"),
            0,
            0
         )
      );

      if (ageTicks <= 1) {
         playSound("barrel-place.mp3", 0.4, 1, this.position.x, this.position.y);
      }
   }

   protected onHit(): void {
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Barrel;