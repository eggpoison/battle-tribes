import { randFloat, randInt } from "battletribes-shared/utils";
import { FishColour } from "battletribes-shared/entities";
import { HitData } from "battletribes-shared/client-server-types";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain } from "../particles";
import { playSound } from "../sound";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { FishComponentArray } from "../entity-components/FishComponent";
import { getEntityRenderInfo } from "../world";
import { TransformComponentArray } from "../entity-components/TransformComponent";

const TEXTURE_SOURCES: Record<FishColour, string> = {
   [FishColour.blue]: "entities/fish/fish-blue.png",
   [FishColour.gold]: "entities/fish/fish-gold.png",
   [FishColour.red]: "entities/fish/fish-red.png",
   [FishColour.lime]: "entities/fish/fish-lime.png"
};

class Fish extends Entity {
   constructor(id: number) {
      super(id);
   }

   public onLoad(): void {
      const fishComponent = FishComponentArray.getComponent(this.id);

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(TEXTURE_SOURCES[fishComponent.colour])
         )
      );
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      // Blood particles
      for (let i = 0; i < 5; i++) {
         const position = transformComponent.position.offset(16, 2 * Math.PI * Math.random());
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, position.x, position.y, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }

      playSound("fish-hurt-" + randInt(1, 4) + ".mp3", 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      createBloodParticleFountain(this.id, 0.1, 0.8);
      
      playSound("fish-die-1.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Fish;