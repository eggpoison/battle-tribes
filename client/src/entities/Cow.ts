import { CowSpecies, EntityType } from "battletribes-shared/entities";
import { angle, randFloat, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { HitData } from "battletribes-shared/client-server-types";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { AudioFilePath, playSound } from "../sound";
import Entity from "../Entity";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_HEIGHT = 96;

   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   constructor(id: number) {
      super(id, EntityType.cow);
   }

   public onLoad(): void {
      const cowComponent = this.getServerComponent(ServerComponentType.cow);
      const cowNum = cowComponent.species === CowSpecies.brown ? 1 : 2;

      // Body
      const bodyRenderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(`entities/cow/cow-body-${cowNum}.png`)
      );
      bodyRenderPart.offset.y = -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2;
      this.attachRenderThing(bodyRenderPart);

      // Head
      const headRenderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex(`entities/cow/cow-head-${cowNum}.png`)
      );
      headRenderPart.offset.y = (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2;
      this.attachRenderThing(headRenderPart);

      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.3, 20, 64, 5, 40));
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
            
      // Blood pool particles
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
      }
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }

      playSound(("cow-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      for (let i = 0; i < 3; i++) {
         createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 35);
      }

      createBloodParticleFountain(this, Cow.BLOOD_FOUNTAIN_INTERVAL, 1.1);

      playSound("cow-die-1.mp3", 0.2, 1, transformComponent.position);
   }
}

export default Cow;