import { randInt } from "battletribes-shared/utils";
import { TileType } from "battletribes-shared/tiles";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../particles";
import Entity from "../Entity";
import { playSound } from "../sound";
import { SLIME_SIZES, SlimeComponentArray } from "../entity-components/server-components/SlimeComponent";
import { getEntityLayer } from "../world";
import { getEntityTile, TransformComponentArray } from "../entity-components/server-components/TransformComponent";

class Slime extends Entity {
   private static readonly NUM_PUDDLE_PARTICLES_ON_HIT: ReadonlyArray<number> = [1, 2, 3];
   private static readonly NUM_PUDDLE_PARTICLES_ON_DEATH: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_HIT: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_DEATH: ReadonlyArray<number> = [6, 10, 15];

   constructor(id: number) {
      super(id);
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const layer = getEntityLayer(this.id);

      // Slimes move at normal speed on slime blocks
      const tile = getEntityTile(layer, transformComponent);
      if (tile.type === TileType.slime) {
         return 1;
      }
      return null;
   }

   protected onHit(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const slimeComponent = SlimeComponentArray.getComponent(this.id);

      const radius = SLIME_SIZES[slimeComponent.size] / 2;
      
      for (let i = 0; i < Slime.NUM_PUDDLE_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
         createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, radius);
      }

      for (let i = 0; i < Slime.NUM_SPECK_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
         createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius * Math.random());
      }

      playSound("slime-hit-" + randInt(1, 2) + ".mp3", 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const slimeComponent = SlimeComponentArray.getComponent(this.id);

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