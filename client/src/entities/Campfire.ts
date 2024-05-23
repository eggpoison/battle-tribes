import { Point, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Board from "../Board";
import { createEmberParticle, createSmokeParticle } from "../particles";
import Entity from "../Entity";
import CookingComponent from "../entity-components/CookingComponent";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import StructureComponent from "../entity-components/StructureComponent";
import TribeComponent from "../entity-components/TribeComponent";

class Campfire extends Entity {
   public static readonly SIZE = 104;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.campfire>) {
      super(position, id, EntityType.campfire, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/campfire/campfire.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.structure, new StructureComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.inventory, new InventoryComponent(this, componentsData[4]));
      this.addServerComponent(ServerComponentType.cooking, new CookingComponent(this, componentsData[5]));
   }

   public tick(): void {
      super.tick();

      // Smoke particles
      if (Board.tickIntervalHasPassed(0.1)) {
         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY);
      }

      // Ember particles
      if (Board.tickIntervalHasPassed(0.05)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createEmberParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(100, 140));
      }
   }
}

export default Campfire;