import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { EntityType, FishColour } from "webgl-test-shared/dist/entities";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import { TileType } from "webgl-test-shared/dist/tiles";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Board from "../Board";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createWaterSplashParticle } from "../particles";
import { AudioFilePath, playSound } from "../sound";
import FishComponent from "../entity-components/FishComponent";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import PhysicsComponent from "../entity-components/PhysicsComponent";

const TEXTURE_SOURCES: Record<FishColour, string> = {
   [FishColour.blue]: "entities/fish/fish-blue.png",
   [FishColour.gold]: "entities/fish/fish-gold.png",
   [FishColour.red]: "entities/fish/fish-red.png",
   [FishColour.lime]: "entities/fish/fish-lime.png"
};

class Fish extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.fish>) {
      super(position, id, EntityType.fish, ageTicks);

      const fishComponentData = componentsData[6];

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex(TEXTURE_SOURCES[fishComponentData.colour]),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]))
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]))
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]))
      this.addServerComponent(ServerComponentType.fish, new FishComponent(this, randFloat(0.6, 1)))
   }

   public tick(): void {
      super.tick();

      if (this.tile.type !== TileType.water && Board.tickIntervalHasPassed(0.4)) {
         for (let i = 0; i < 8; i++) {
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = this.position.x + 8 * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.position.y + 8 * Math.cos(spawnOffsetDirection);

            createWaterSplashParticle(spawnPositionX, spawnPositionY);
         }
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 5; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + 16 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + 16 * Math.cos(offsetDirection);
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }

      playSound(("fish-hurt-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      createBloodParticleFountain(this, 0.1, 0.8);
      
      playSound("fish-die-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Fish;