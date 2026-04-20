import { randAngle, randFloat, Entity, ServerComponentType, Settings } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { TransformComponentArray } from "./TransformComponent";
import { createEmberParticle, createSmokeParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../game";
import { getTransformComponentData } from "../../entity-component-types";

export interface FireTorchComponentData {}

interface IntermediateInfo {}

export interface FireTorchComponent {}

export const FireTorchComponentArray = new ServerComponentArray<FireTorchComponent, FireTorchComponentData, IntermediateInfo>(ServerComponentType.fireTorch, true, createComponent, getMaxRenderParts, decodeData);
FireTorchComponentArray.populateIntermediateInfo = populateIntermediateInfo;
FireTorchComponentArray.onTick = onTick;

export function createFireTorchComponentData(): FireTorchComponentData {
   return {};
}

function decodeData(): FireTorchComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
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

   return {};
}

function createComponent(): FireTorchComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
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