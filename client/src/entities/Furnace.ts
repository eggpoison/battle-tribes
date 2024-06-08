import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, angle, randFloat } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createEmberParticle, createRockParticle, createRockSpeckParticle, createSmokeParticle } from "../particles";
import Board from "../Board";
import Entity from "../Entity";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";

class Furnace extends Entity {
   public static readonly SIZE = 80;

   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.furnace, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/furnace/furnace.png"),
            0,
            0
         )
      );
   }

   public tick(): void {
      super.tick();

      const cookingComponent = this.getServerComponent(ServerComponentType.cooking);
      if (cookingComponent.isCooking) {
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
            let spawnPositionX = this.position.x - 30 * Math.sin(this.rotation);
            let spawnPositionY = this.position.y - 30 * Math.cos(this.rotation);

            const spawnOffsetMagnitude = 11 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            createEmberParticle(spawnPositionX, spawnPositionY, this.rotation + Math.PI + randFloat(-0.8, 0.8), randFloat(80, 120));
         }
      }
   }

   protected onHit(): void {
      for (let i = 0; i < 2; i++) {
         let spawnPositionX: number;
         let spawnPositionY: number;
         if (Math.random() < 0.5) {
            spawnPositionX = this.position.x + (Math.random() < 0.5 ? -0.5 : 0.5) * Furnace.SIZE;
            spawnPositionY = this.position.y + randFloat(-0.5, 0.5) * Furnace.SIZE;
         } else {
            spawnPositionX = this.position.x + randFloat(-0.5, 0.5) * Furnace.SIZE;
            spawnPositionY = this.position.y + (Math.random() < 0.5 ? -0.5 : 0.5) * Furnace.SIZE;
         }

         let moveDirection = angle(spawnPositionX - this.position.x, spawnPositionY - this.position.y)
         
         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Furnace.SIZE / 2, 0, 0, ParticleRenderLayer.low);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 5; i++) {
         const spawnPositionX = this.position.x + randFloat(-0.5, 0.5) * Furnace.SIZE;
         const spawnPositionY = this.position.y + randFloat(-0.5, 0.5) * Furnace.SIZE;

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Furnace.SIZE / 2, 0, 0, ParticleRenderLayer.low);
      }
   }
}

export default Furnace;