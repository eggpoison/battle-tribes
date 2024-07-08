import { Point, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Board from "../Board";
import { createEmberParticle, createSmokeParticle } from "../particles";
import Entity from "../Entity";
import { playSound } from "../sound";

class Campfire extends Entity {
   public static readonly SIZE = 104;

   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.campfire, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/campfire/campfire.png"),
            0,
            0
         )
      );

      // @Cleanup: why <= 1?
      if (this.ageTicks <= 1) {
         playSound("wooden-wall-place.mp3", 0.3, 1, this.position.x, this.position.y);
      }
   }

   public tick(): void {
      super.tick();

      // Smoke particles
      if (Board.tickIntervalHasPassed(0.1)) {
         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY);
      }

      // Ember particles
      if (Board.tickIntervalHasPassed(0.05)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createEmberParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(100, 140));
      }
   }
}

export default Campfire;