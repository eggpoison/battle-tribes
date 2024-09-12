import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { angle, randFloat } from "battletribes-shared/utils";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { createRockParticle, createRockSpeckParticle } from "../particles";
import Entity from "../Entity";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Furnace extends Entity {
   public static readonly SIZE = 80;

   constructor(id: number) {
      super(id, EntityType.furnace);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/furnace/furnace.png")
         )
      );
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