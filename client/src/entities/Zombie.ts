import { ServerComponentType } from "battletribes-shared/components";
import { angle, randFloat, randInt } from "battletribes-shared/utils";
import { HitData } from "battletribes-shared/client-server-types";
import { EntityType } from "battletribes-shared/entities";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { AudioFilePath, playSound } from "../sound";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";

const ZOMBIE_TEXTURE_SOURCES: ReadonlyArray<string> = ["entities/zombie/zombie1.png", "entities/zombie/zombie2.png", "entities/zombie/zombie3.png", "entities/zombie/zombie-golden.png"];
const ZOMBIE_HAND_TEXTURE_SOURCES: ReadonlyArray<string> = ["entities/zombie/fist-1.png", "entities/zombie/fist-2.png", "entities/zombie/fist-3.png", "entities/zombie/fist-4.png"];

class Zombie extends Entity {
   private static readonly RADIUS = 32;
   
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   constructor(id: number) {
      super(id);

   }

   public onLoad(): void {
      const zombieComponent = this.getServerComponent(ServerComponentType.zombie);

      // Body render part
      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            2,
            0,
            getTextureArrayIndex(ZOMBIE_TEXTURE_SOURCES[zombieComponent.zombieType])
         )
      );

      // Hand render parts
      const handTextureSource = ZOMBIE_HAND_TEXTURE_SOURCES[zombieComponent.zombieType];
      const handRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const renderPart = new TexturedRenderPart(
            null,
            1,
            0,
            getTextureArrayIndex(handTextureSource)
         );
         renderPart.addTag("inventoryUseComponent:hand");
         this.attachRenderThing(renderPart);
         handRenderParts.push(renderPart);
      }
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      // Blood pool particle
      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + Zombie.RADIUS * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + Zombie.RADIUS * Math.cos(offsetDirection);
      
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }

      playSound(("zombie-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
      createBloodParticleFountain(this, Zombie.BLOOD_FOUNTAIN_INTERVAL, 1);

      playSound("zombie-die-1.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Zombie;