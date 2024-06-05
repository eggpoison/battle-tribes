import { EntityType, GenericArrowType } from "webgl-test-shared/dist/entities";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity, { ComponentDataRecord } from "../Entity";
import { playSound } from "../sound";
import { createArrowDestroyParticle, createRockParticle, createRockSpeckParticle } from "../particles";
import { ParticleRenderLayer } from "../rendering/particle-rendering";

const ARROW_TEXTURE_SOURCES: Record<GenericArrowType, string> = {
   [GenericArrowType.woodenArrow]: "projectiles/wooden-arrow.png",
   [GenericArrowType.woodenBolt]: "projectiles/wooden-bolt.png",
   [GenericArrowType.ballistaRock]: "projectiles/ballista-rock.png",
   [GenericArrowType.ballistaSlimeball]: "projectiles/ballista-slimeball.png",
   [GenericArrowType.ballistaFrostcicle]: "projectiles/ballista-frostcicle.png",
   [GenericArrowType.slingRock]: "projectiles/sling-rock.png"
};

class WoodenArrowProjectile extends Entity {

   constructor(position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) {
      super(position, id, EntityType.woodenArrowProjectile, ageTicks);

      const arrowComponentData = componentDataRecord[ServerComponentType.arrow]!;
      
      const textureArrayIndex = getTextureArrayIndex(ARROW_TEXTURE_SOURCES[arrowComponentData.arrowType]);
      this.attachRenderPart(
         new RenderPart(
            this,
            textureArrayIndex,
            0,
            0
         )
      );
   }

   public onRemove(): void {
      // Create arrow break particles
      const physicsComponent = this.getServerComponent(ServerComponentType.physics);
      for (let i = 0; i < 6; i++) {
         createArrowDestroyParticle(this.position.x, this.position.y, physicsComponent.velocity.x, physicsComponent.velocity.y);
      }
   }

   public onDie(): void {
      const arrowComponent = this.getServerComponent(ServerComponentType.arrow);
      
      switch (arrowComponent.arrowType) {
         case GenericArrowType.ballistaFrostcicle: {
            playSound("ice-break.mp3", 0.4, 1, this.position.x, this.position.y);
            break;
         }
         default: {
            playSound("arrow-hit.mp3", 0.4, 1, this.position.x, this.position.y);
         }
      }
      
      switch (arrowComponent.arrowType) {
         case GenericArrowType.slingRock: {
            for (let i = 0; i < 3; i++) {
               const spawnOffsetMagnitude = 16 * Math.random();
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

               createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(60, 100), ParticleRenderLayer.low);
            }

            for (let i = 0; i < 5; i++) {
               createRockSpeckParticle(this.position.x, this.position.y, 16, 0, 0, ParticleRenderLayer.low);
            }
            break;
         }
      }
   }
}

export default WoodenArrowProjectile;