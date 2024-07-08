import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";

class TribeTotem extends Entity {
   public static readonly SIZE = 120;

   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.tribeTotem, ageTicks);

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/tribe-totem/tribe-totem.png`),
         1,
         0
      );
      this.attachRenderPart(renderPart);
   }

   protected onHit(): void {
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default TribeTotem;