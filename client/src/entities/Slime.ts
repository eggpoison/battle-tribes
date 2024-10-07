import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { randInt } from "battletribes-shared/utils";
import { TileType } from "battletribes-shared/tiles";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../particles";
import Entity from "../Entity";
import { AudioFilePath, playSound } from "../sound";
import { SLIME_SIZES } from "../entity-components/SlimeComponent";

class Slime extends Entity {
   private static readonly NUM_PUDDLE_PARTICLES_ON_HIT: ReadonlyArray<number> = [1, 2, 3];
   private static readonly NUM_PUDDLE_PARTICLES_ON_DEATH: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_HIT: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_DEATH: ReadonlyArray<number> = [6, 10, 15];

   constructor(id: number) {
      super(id);
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      // Slimes move at normal speed on slime blocks
      if (transformComponent.tile.type === TileType.slime) {
         return 1;
      }
      return null;
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      const slimeComponent = this.getServerComponent(ServerComponentType.slime);

      const radius = SLIME_SIZES[slimeComponent.size] / 2;
      
      for (let i = 0; i < Slime.NUM_PUDDLE_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
         createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, radius);
      }

      for (let i = 0; i < Slime.NUM_SPECK_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
         createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius * Math.random());
      }

      playSound(("slime-hit-" + randInt(1, 2) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      const slimeComponent = this.getServerComponent(ServerComponentType.slime);

      const radius = SLIME_SIZES[slimeComponent.size] / 2;

      for (let i = 0; i < Slime.NUM_PUDDLE_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
         createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, radius);
      }

      for (let i = 0; i < Slime.NUM_SPECK_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
         createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius * Math.random());
      }

      playSound("slime-death.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Slime;