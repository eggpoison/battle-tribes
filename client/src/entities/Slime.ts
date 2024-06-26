import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { TileType } from "webgl-test-shared/dist/tiles";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../particles";
import Entity from "../Entity";
import { AudioFilePath, playSound } from "../sound";
import { Settings } from "webgl-test-shared/dist/settings";
import { SLIME_SIZES } from "../entity-components/SlimeComponent";

class Slime extends Entity {
   private static readonly NUM_PUDDLE_PARTICLES_ON_HIT: ReadonlyArray<number> = [1, 2, 3];
   private static readonly NUM_PUDDLE_PARTICLES_ON_DEATH: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_HIT: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_DEATH: ReadonlyArray<number> = [6, 10, 15];

   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.slime, ageTicks);
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      // Slimes move at normal speed on slime blocks
      if (this.tile.type === TileType.slime) {
         return 1;
      }
      return null;
   }

   public tick(): void {
      if (Math.random() < 0.2 / Settings.TPS) {
         playSound(("slime-ambient-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
      }
   }

   protected onHit(): void {
      const slimeComponent = this.getServerComponent(ServerComponentType.slime);
      const radius = SLIME_SIZES[slimeComponent.size] / 2;
      
      for (let i = 0; i < Slime.NUM_PUDDLE_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
         createSlimePoolParticle(this.position.x, this.position.y, radius);
      }

      for (let i = 0; i < Slime.NUM_SPECK_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, radius * Math.random());
      }

      playSound(("slime-hit-" + randInt(1, 2) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      const slimeComponent = this.getServerComponent(ServerComponentType.slime);
      const radius = SLIME_SIZES[slimeComponent.size] / 2;

      for (let i = 0; i < Slime.NUM_PUDDLE_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
         createSlimePoolParticle(this.position.x, this.position.y, radius);
      }

      for (let i = 0; i < Slime.NUM_SPECK_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, radius * Math.random());
      }

      playSound("slime-death.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Slime;