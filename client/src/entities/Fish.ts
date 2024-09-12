import { randFloat, randInt } from "battletribes-shared/utils";
import { EntityType, FishColour } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { HitData } from "battletribes-shared/client-server-types";
import { TileType } from "battletribes-shared/tiles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Board from "../Board";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createWaterSplashParticle } from "../particles";
import { AudioFilePath, playSound } from "../sound";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

const TEXTURE_SOURCES: Record<FishColour, string> = {
   [FishColour.blue]: "entities/fish/fish-blue.png",
   [FishColour.gold]: "entities/fish/fish-gold.png",
   [FishColour.red]: "entities/fish/fish-red.png",
   [FishColour.lime]: "entities/fish/fish-lime.png"
};

class Fish extends Entity {
   constructor(id: number) {
      super(id, EntityType.fish);
   }

   public onLoad(): void {
      const fishComponent = this.getServerComponent(ServerComponentType.fish);

      this.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(TEXTURE_SOURCES[fishComponent.colour])
         )
      );
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      // Blood particles
      for (let i = 0; i < 5; i++) {
         const position = transformComponent.position.offset(16, 2 * Math.PI * Math.random());
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, position.x, position.y, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }

      playSound(("fish-hurt-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      createBloodParticleFountain(this, 0.1, 0.8);
      
      playSound("fish-die-1.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Fish;