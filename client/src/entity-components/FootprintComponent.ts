import { Settings } from "webgl-test-shared/dist/settings";
import { randInt } from "webgl-test-shared/dist/utils";
import { TileType } from "webgl-test-shared/dist/tiles";
import Component from "./Component";
import { playSound, AudioFilePath } from "../sound";
import Board from "../Board";
import { createFootprintParticle } from "../particles";
import Entity from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";

export class FootprintComponent extends Component {
   private readonly footstepParticleIntervalSeconds: number;
   private readonly footstepOffset: number;
   private readonly footstepSize: number;
   private readonly footstepLifetime: number;
   private readonly footstepSoundIntervalDist: number;

   constructor(entity: Entity, footstepParticleIntervalSeconds: number, footstepOffset: number, footstepSize: number, footstepLifetime: number, footstepSoundIntervalDist: number) {
      super(entity);
      
      this.footstepParticleIntervalSeconds = footstepParticleIntervalSeconds;
      this.footstepOffset = footstepOffset;
      this.footstepSize = footstepSize;
      this.footstepLifetime = footstepLifetime;
      this.footstepSoundIntervalDist = footstepSoundIntervalDist;
   }
   
   private numFootstepsTaken = 0;
   private distanceTracker = 0;

   public tick(): void {
      const physicsComponent = this.entity.getServerComponent(ServerComponentType.physics);

      // Footsteps
      if (physicsComponent.velocity.lengthSquared() >= 2500 && !this.entity.isInRiver() && Board.tickIntervalHasPassed(this.footstepParticleIntervalSeconds)) {
         createFootprintParticle(this.entity, this.numFootstepsTaken, this.footstepOffset, this.footstepSize, this.footstepLifetime);
         this.numFootstepsTaken++;
      }
      this.distanceTracker += physicsComponent.velocity.length() / Settings.TPS;
      if (this.distanceTracker > this.footstepSoundIntervalDist) {
         this.distanceTracker -= this.footstepSoundIntervalDist;
         this.createFootstepSound();
      }
   }

   private createFootstepSound(): void {
      switch (this.entity.tile.type) {
         case TileType.grass: {
            playSound(("grass-walk-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.04, 1, this.entity.position.x, this.entity.position.y);
            break;
         }
         case TileType.sand: {
            playSound(("sand-walk-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.02, 1, this.entity.position.x, this.entity.position.y);
            break;
         }
         case TileType.snow: {
            playSound(("snow-walk-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.07, 1, this.entity.position.x, this.entity.position.y);
            break;
         }
         case TileType.rock: {
            playSound(("rock-walk-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.08, 1, this.entity.position.x, this.entity.position.y);
            break;
         }
         case TileType.water: {
            if (!this.entity.isInRiver()) {
               playSound(("rock-walk-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.08, 1, this.entity.position.x, this.entity.position.y);
            }
            break;
         }
      }
   }
}

export default FootprintComponent;