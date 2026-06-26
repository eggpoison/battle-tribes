import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { Settings } from "../../../../../shared/src/settings";
import { randAngle, randFloat } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { createSmokeParticle, createEmberParticle } from "../../particles";
import { CookingComponentArray } from "./CookingComponent";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface CampfireComponentData {}

export interface CampfireComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.campfire, typeof CampfireComponentArray> {}
}

export const CampfireComponentArray = registerServerComponentArray(
   ServerComponentType.campfire,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
CampfireComponentArray.populateIntermediateInfo = populateIntermediateInfo;
CampfireComponentArray.onTick = onTick;

export function createCampfireComponentData(): CampfireComponentData {
   return {};
}

function decodeData(): CampfireComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.entities_campfire_campfire
      )
   );
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
         const spawnPositionX = hitbox.box.posX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.posY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY, 48);
      }

      // Ember particles
      if (tickIntervalHasPassed(0.05 * Settings.TICK_RATE)) {
         let spawnPositionX = hitbox.box.posX;
         let spawnPositionY = hitbox.box.posY;

         const spawnOffsetMagnitude = 11 * Math.random();
         const spawnOffsetDirection = randAngle();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createEmberParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), 0, 0);
      }
   }
}