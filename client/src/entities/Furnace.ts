import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { angle, randFloat } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { createEmberParticle, createRockParticle, createRockSpeckParticle, createSmokeParticle } from "../particles";
import Board from "../Board";
import Entity from "../Entity";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";

class Furnace extends Entity {
   public static readonly SIZE = 80;

   constructor(id: number) {
      super(id, EntityType.furnace);

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
         const transformComponent = this.getServerComponent(ServerComponentType.transform);

         // Smoke particles
         if (Board.tickIntervalHasPassed(0.1)) {
            const spawnOffsetMagnitude = 20 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
            createSmokeParticle(spawnPositionX, spawnPositionY);
         }

         // Ember particles
         if (Board.tickIntervalHasPassed(0.05)) {
            let spawnPositionX = transformComponent.position.x - 30 * Math.sin(transformComponent.rotation);
            let spawnPositionY = transformComponent.position.y - 30 * Math.cos(transformComponent.rotation);

            const spawnOffsetMagnitude = 11 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            createEmberParticle(spawnPositionX, spawnPositionY, transformComponent.rotation + Math.PI + randFloat(-0.8, 0.8), randFloat(80, 120));
         }
      }
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      for (let i = 0; i < 2; i++) {
         let spawnPositionX: number;
         let spawnPositionY: number;
         if (Math.random() < 0.5) {
            spawnPositionX = transformComponent.position.x + (Math.random() < 0.5 ? -0.5 : 0.5) * Furnace.SIZE;
            spawnPositionY = transformComponent.position.y + randFloat(-0.5, 0.5) * Furnace.SIZE;
         } else {
            spawnPositionX = transformComponent.position.x + randFloat(-0.5, 0.5) * Furnace.SIZE;
            spawnPositionY = transformComponent.position.y + (Math.random() < 0.5 ? -0.5 : 0.5) * Furnace.SIZE;
         }

         let moveDirection = angle(spawnPositionX - transformComponent.position.x, spawnPositionY - transformComponent.position.y)
         
         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, Furnace.SIZE / 2, 0, 0, ParticleRenderLayer.low);
      }
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      for (let i = 0; i < 5; i++) {
         const spawnPositionX = transformComponent.position.x + randFloat(-0.5, 0.5) * Furnace.SIZE;
         const spawnPositionY = transformComponent.position.y + randFloat(-0.5, 0.5) * Furnace.SIZE;

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, Furnace.SIZE / 2, 0, 0, ParticleRenderLayer.low);
      }
   }
}

export default Furnace;