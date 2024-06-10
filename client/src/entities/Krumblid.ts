import { HitData } from "webgl-test-shared/dist/client-server-types";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, angle, randFloat } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import Entity from "../Entity";

class Krumblid extends Entity {
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.krumblid, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/krumblid/krumblid.png"),
            0,
            0
         )
      );

      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.3, 20, 64, 5, 50));
   }

   protected onHit(hitData: HitData): void {
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      
      // Blood particles
      for (let i = 0; i < 5; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - this.position.x, hitData.hitPosition[1] - this.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = this.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = this.position.y + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(this.position.x, this.position.y, 35);
      }

      createBloodParticleFountain(this, Krumblid.BLOOD_FOUNTAIN_INTERVAL, 0.8);
   }
}

export default Krumblid;