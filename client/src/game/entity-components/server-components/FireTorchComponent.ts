import { randAngle, randFloat, Entity, ServerComponentType, Settings } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { TransformComponentArray } from "./TransformComponent";
import { createEmberParticle, createSmokeParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface FireTorchComponentData {}

export interface FireTorchComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fireTorch, _FireTorchComponentArray, FireTorchComponentData> {}
}

class _FireTorchComponentArray extends _ServerComponentArray<FireTorchComponent, FireTorchComponentData> {
   public decodeData(): FireTorchComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/fire-torch/fire-torch.png")
      );
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): FireTorchComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onTick(entity: Entity): void {
      // @Copynpaste: all of these effects from InventoryUseComponent
      
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      
      // Ember particles
      if (tickIntervalHasPassed(0.15 * Settings.TICK_RATE)) {
         let spawnPositionX = hitbox.box.position.x;
         let spawnPositionY = hitbox.box.position.y;

         const spawnOffsetMagnitude = 7 * Math.random();
         const spawnOffsetDirection = randAngle();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createEmberParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), 0, 0);
      }

      // Smoke particles
      if (tickIntervalHasPassed(0.18 * Settings.TICK_RATE)) {
         const spawnOffsetMagnitude = 5 * Math.random();
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY, 24);
      }
   }
}

export const FireTorchComponentArray = registerServerComponentArray(ServerComponentType.fireTorch, _FireTorchComponentArray, true);

export function createFireTorchComponentData(): FireTorchComponentData {
   return {};
}