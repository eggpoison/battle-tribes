import { randAngle, randFloat, Entity, ServerComponentType, Settings } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { createSmokeParticle, createEmberParticle } from "../../particles";
import { CookingComponentArray } from "./CookingComponent";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../game";
import { getTransformComponentData } from "../../entity-component-types";

export interface CampfireComponentData {}

interface IntermediateInfo {}

export interface CampfireComponent {}

export const CampfireComponentArray = new ServerComponentArray<CampfireComponent, CampfireComponentData, IntermediateInfo>(ServerComponentType.campfire, true, createComponent, getMaxRenderParts, decodeData);
CampfireComponentArray.populateIntermediateInfo = populateIntermediateInfo;
CampfireComponentArray.onTick = onTick;

export function createCampfireComponentData(): CampfireComponentData {
   return {};
}

function decodeData(): CampfireComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/campfire/campfire.png")
      )
   );

   return {};
}

function createComponent(): CampfireComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
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
         let spawnPositionX = hitbox.box.position.x;
         let spawnPositionY = hitbox.box.position.y;

         const spawnOffsetMagnitude = 11 * Math.random();
         const spawnOffsetDirection = randAngle();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createEmberParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), 0, 0);
      }
   }
}