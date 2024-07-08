import { CowSpecies, EntityType } from "webgl-test-shared/dist/entities";
import { Point, angle, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { AudioFilePath, playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_HEIGHT = 96;

   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   constructor(position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) {
      super(position, id, EntityType.cow, ageTicks);

      const cowComponentData = componentDataRecord[ServerComponentType.cow]!;
      const cowNum = cowComponentData.species === CowSpecies.brown ? 1 : 2;

      // Body
      const bodyRenderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/cow/cow-body-${cowNum}.png`),
         0,
         0
      );
      bodyRenderPart.offset.y = -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2;
      this.attachRenderPart(bodyRenderPart);

      // Head
      const headRenderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/cow/cow-head-${cowNum}.png`),
         1,
         0
      );
      headRenderPart.offset.y = (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2;
      this.attachRenderPart(headRenderPart);

      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.3, 20, 64, 5, 40));
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particles
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(this.position.x, this.position.y, 20);
      }
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - this.position.x, hitData.hitPosition[1] - this.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = this.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = this.position.y + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }

      playSound(("cow-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      for (let i = 0; i < 3; i++) {
         createBloodPoolParticle(this.position.x, this.position.y, 35);
      }

      createBloodParticleFountain(this, Cow.BLOOD_FOUNTAIN_INTERVAL, 1.1);

      playSound("cow-die-1.mp3", 0.2, 1, this.position.x, this.position.y);
   }
}

export default Cow;