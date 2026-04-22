import { randFloat, angle, randAngle, Entity, ServerComponentType, Settings, RectangularBox } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { createEmberParticle, createRockParticle, createRockSpeckParticle, createSmokeParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { TransformComponentArray } from "./TransformComponent";
import { CookingComponentArray } from "./CookingComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface FurnaceComponentData {}

export interface FurnaceComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.furnace, _FurnaceComponentArray, FurnaceComponentData> {}
}

class _FurnaceComponentArray extends _ServerComponentArray<FurnaceComponent, FurnaceComponentData> {
   public decodeData(): FurnaceComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/furnace/furnace.png")
         )
      );
   }

   public createComponent(): FurnaceComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onTick(entity: Entity): void {
      const cookingComponent = CookingComponentArray.getComponent(entity);
      const transformComponent = TransformComponentArray.getComponent(entity);
      
      if (cookingComponent.isCooking) {
         const hitbox = transformComponent.hitboxes[0];

         // Smoke particles
         if (tickIntervalHasPassed(0.17 * Settings.TICK_RATE)) {
            const spawnOffsetMagnitude = 20 * Math.random();
            const spawnOffsetDirection = randAngle();
            const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
            createSmokeParticle(spawnPositionX, spawnPositionY, 48);
         }

         // Ember particles
         if (tickIntervalHasPassed(0.05 * Settings.TICK_RATE)) {
            let spawnPositionX = hitbox.box.position.x - 30 * Math.sin(hitbox.box.angle);
            let spawnPositionY = hitbox.box.position.y - 30 * Math.cos(hitbox.box.angle);

            const spawnOffsetMagnitude = 11 * Math.random();
            const spawnOffsetDirection = randAngle();
            spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            createEmberParticle(spawnPositionX, spawnPositionY, hitbox.box.angle + Math.PI + randFloat(-0.8, 0.8), randFloat(80, 120), 0, 0);
         }
      }
   }

   public onHit(_entity: Entity, hitbox: Hitbox): void {
      const size = (hitbox.box as RectangularBox).width;
      
      for (let i = 0; i < 2; i++) {
         let spawnPositionX: number;
         let spawnPositionY: number;
         if (Math.random() < 0.5) {
            spawnPositionX = hitbox.box.position.x + (Math.random() < 0.5 ? -0.5 : 0.5) * size;
            spawnPositionY = hitbox.box.position.y + randFloat(-0.5, 0.5) * size;
         } else {
            spawnPositionX = hitbox.box.position.x + randFloat(-0.5, 0.5) * size;
            spawnPositionY = hitbox.box.position.y + (Math.random() < 0.5 ? -0.5 : 0.5) * size;
         }

         let moveDirection = angle(spawnPositionX - hitbox.box.position.x, spawnPositionY - hitbox.box.position.y)
         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, size / 2, 0, 0, ParticleRenderLayer.low);
      }
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      const size = (hitbox.box as RectangularBox).width;

      for (let i = 0; i < 5; i++) {
         const spawnPositionX = hitbox.box.position.x + randFloat(-0.5, 0.5) * size;
         const spawnPositionY = hitbox.box.position.y + randFloat(-0.5, 0.5) * size;

         createRockParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, size / 2, 0, 0, ParticleRenderLayer.low);
      }
   }
}

export const FurnaceComponentArray = registerServerComponentArray(ServerComponentType.furnace, _FurnaceComponentArray, true);

export function createFurnaceComponentData(): FurnaceComponentData {
   return {};
}