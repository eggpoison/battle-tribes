import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { TileType } from "webgl-test-shared/dist/tiles";
import { EntityData } from "webgl-test-shared/dist/client-server-types";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../particles";
import SlimeComponent from "../entity-components/SlimeComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import HealthComponent from "../entity-components/HealthComponent";
import PhysicsComponent from "../entity-components/PhysicsComponent";
import Entity from "../Entity";

class Slime extends Entity {
   public static readonly SIZES: ReadonlyArray<number> = [
      64, // small
      88, // medium
      120 // large
   ];
   public static readonly SIZE_STRINGS: ReadonlyArray<string> = ["small", "medium", "large"];

   private static readonly NUM_PUDDLE_PARTICLES_ON_HIT: ReadonlyArray<number> = [1, 2, 3];
   private static readonly NUM_PUDDLE_PARTICLES_ON_DEATH: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_HIT: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_DEATH: ReadonlyArray<number> = [6, 10, 15];

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.slime>) {
      super(position, id, EntityType.slime, ageTicks);

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.slime, new SlimeComponent(this, componentsData[3]));
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      // Slimes move at normal speed on slime blocks
      if (this.tile.type === TileType.slime) {
         return 1;
      }
      return null;
   }

   public updateFromData(entityData: EntityData<EntityType.slime>): void {
      super.updateFromData(entityData);
   }

   protected onHit(): void {
      const slimeComponent = this.getServerComponent(ServerComponentType.slime);
      const radius = Slime.SIZES[slimeComponent.size] / 2;
      
      for (let i = 0; i < Slime.NUM_PUDDLE_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
         createSlimePoolParticle(this.position.x, this.position.y, radius);
      }

      for (let i = 0; i < Slime.NUM_SPECK_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, radius * Math.random());
      }
   }

   public onDie(): void {
      const slimeComponent = this.getServerComponent(ServerComponentType.slime);
      const radius = Slime.SIZES[slimeComponent.size] / 2;

      for (let i = 0; i < Slime.NUM_PUDDLE_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
         createSlimePoolParticle(this.position.x, this.position.y, radius);
      }

      for (let i = 0; i < Slime.NUM_SPECK_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, radius * Math.random());
      }
   }
}

export default Slime;