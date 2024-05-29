import { Point, angle, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { BloodParticleSize, createBlueBloodParticle, createBlueBloodParticleFountain, createBlueBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "../Entity";
import { FROZEN_YETI_HEAD_DISTANCE } from "../entity-components/FrozenYetiComponent";

class FrozenYeti extends Entity {
   private static readonly SIZE = 152;
   
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.frozenYeti, ageTicks);

      this.attachRenderPart(new RenderPart(
         this,
         getTextureArrayIndex("entities/frozen-yeti/frozen-yeti.png"),
         1,
         0
      ));

      const headRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/frozen-yeti/frozen-yeti-head.png"),
         2,
         0
      );
      headRenderPart.addTag("frozenYetiComponent:head");
      headRenderPart.offset.y = FROZEN_YETI_HEAD_DISTANCE;
      this.attachRenderPart(headRenderPart);

      // Create paw render parts
      const pawRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const paw = new RenderPart(
            this,
            getTextureArrayIndex("entities/frozen-yeti/frozen-yeti-paw.png"),
            0,
            0
         );
         paw.addTag("frozenYetiComponent:paw");

         this.attachRenderPart(paw);
         pawRenderParts.push(paw);
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBlueBloodPoolParticle(this.position.x, this.position.y, FrozenYeti.SIZE / 2);
      
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - this.position.x, hitData.hitPosition[1] - this.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = this.position.x + FrozenYeti.SIZE / 2 * Math.sin(offsetDirection);
         const spawnPositionY = this.position.y + FrozenYeti.SIZE / 2 * Math.cos(offsetDirection);
         createBlueBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 4; i++) {
         createBlueBloodPoolParticle(this.position.x, this.position.y, FrozenYeti.SIZE / 2);
      }

      createBlueBloodParticleFountain(this, 0.15, 1.4);
   }
}

export default FrozenYeti;