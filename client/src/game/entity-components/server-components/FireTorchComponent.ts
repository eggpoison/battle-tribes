import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { Settings } from "../../../../../shared/src/settings";
import { randAngle, randFloat } from "../../../../../shared/src/utils";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { TransformComponentArray } from "./TransformComponent";
import { createEmberParticle, createSmokeParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface FireTorchComponentData {}

export interface FireTorchComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fireTorch, _FireTorchComponentArray> {}
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
         TextureIndex.entities_fireTorch_fireTorch
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
         let spawnPositionX = hitbox.box.posX;
         let spawnPositionY = hitbox.box.posY;

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
         const spawnPositionX = hitbox.box.posX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.posY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY, 24);
      }
   }
}

export const FireTorchComponentArray = registerServerComponentArray(ServerComponentType.fireTorch, _FireTorchComponentArray, true);

export function createFireTorchComponentData(): FireTorchComponentData {
   return {};
}