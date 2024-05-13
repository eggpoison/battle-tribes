import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import RenderPart from "../render-parts/RenderPart";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import PhysicsComponent from "../entity-components/PhysicsComponent";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import Entity from "../Entity";
import { TileType } from "webgl-test-shared/dist/tiles";

class Slimewisp extends Entity {
   private static readonly RADIUS = 16;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.slimewisp>) {
      super(position, id, EntityType.slimewisp, ageTicks);

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/slimewisp/slimewisp.png`),
         0,
         0
      );
      renderPart.opacity = 0.8;
      this.attachRenderPart(renderPart);

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      // Slimewisps move at normal speed on slime blocks
      if (this.tile.type === TileType.slime) {
         return 1;
      }
      return null;
   }

   protected onHit(): void {
      createSlimePoolParticle(this.position.x, this.position.y, Slimewisp.RADIUS);

      for (let i = 0; i < 2; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, Slimewisp.RADIUS * Math.random());
      }
   }

   public onDie(): void {
      createSlimePoolParticle(this.position.x, this.position.y, Slimewisp.RADIUS);

      for (let i = 0; i < 3; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, Slimewisp.RADIUS * Math.random());
      }
   }
}

export default Slimewisp;