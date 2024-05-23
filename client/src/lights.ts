import { Point, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import Board from "./Board";

type LightID = number;

export interface Light {
   readonly position: Point;
   intensity: number;
   /** Number of tiles which the light extends from */
   strength: number;
   radius: number;
   r: number;
   g: number;
   b: number;
}

let lightIDCounter = 0;

const lights = new Array<Light>();
const lightIDs = new Array<LightID>();
const lightRecord: Record<LightID, Light> = {};

const lightToEntityRecord: Partial<Record<LightID, number>> = {};
const entityToLightsRecord: Partial<Record<number, Array<LightID>>> = {};

const lightToRenderPartRecord: Partial<Record<LightID, number>> = {};
const renderPartToLightsRecord: Partial<Record<number, Array<LightID>>> = {};

export function getLights(): ReadonlyArray<Light> {
   return lights;
}

export function addLight(light: Light): LightID {
   lights.push(light);
   
   const lightID = lightIDCounter;
   lightIDs.push(lightID);
   lightIDCounter++;

   lightRecord[lightID] = light;

   return lightID;
}

export function attachLightToEntity(lightID: LightID, entityID: number): void {
   lightToEntityRecord[lightID] = entityID;

   const lightIDs = entityToLightsRecord[entityID];
   if (typeof lightIDs === "undefined") {
      entityToLightsRecord[entityID] = [lightID];
   } else {
      lightIDs.push(lightID);
   }
}

export function attachLightToRenderPart(lightID: LightID, renderPartID: number): void {
   lightToRenderPartRecord[lightID] = renderPartID;

   const lightIDs = renderPartToLightsRecord[renderPartID];
   if (typeof lightIDs === "undefined") {
      renderPartToLightsRecord[renderPartID] = [lightID];
   } else {
      lightIDs.push(lightID);
   }
}

export function removeLight(light: Light): void {
   const idx = lights.indexOf(light);
   if (idx === -1) {
      return;
   }
   
   const lightID = lightIDs[idx];
   
   lights.splice(idx, 1);
   lightIDs.splice(idx, 1);

   const entityID = lightToEntityRecord[lightID];
   delete lightToEntityRecord[lightID];
   if (typeof entityID !== "undefined") {
      const idx = entityToLightsRecord[entityID]!.indexOf(lightID);
      entityToLightsRecord[entityID]!.splice(idx, 1);
      if (entityToLightsRecord[entityID]!.length === 0) {
         delete entityToLightsRecord[entityID];
      }
   }

   const renderPartID = lightToRenderPartRecord[lightID];
   delete lightToRenderPartRecord[lightID];
   if (typeof renderPartID !== "undefined") {
      const idx = renderPartToLightsRecord[renderPartID]!.indexOf(lightID);
      renderPartToLightsRecord[renderPartID]!.splice(idx, 1);
      if (renderPartToLightsRecord[renderPartID]!.length === 0) {
         delete renderPartToLightsRecord[renderPartID];
      }
   }
}

export function removeLightsAttachedToEntity(entityID: number): void {
   const lightIDs = entityToLightsRecord[entityID];
   if (typeof lightIDs === "undefined") {
      return;
   }

   for (let i = lightIDs.length - 1; i >= 0; i--) {
      const lightID = lightIDs[i];
      const light = lightRecord[lightID];
      removeLight(light);
   }
}

export function removeLightsAttachedToRenderPart(renderPartID: number): void {
   const lightIDs = renderPartToLightsRecord[renderPartID];
   if (typeof lightIDs === "undefined") {
      return;
   }

   for (let i = lightIDs.length - 1; i >= 0; i--) {
      const lightID = lightIDs[i];
      const light = lightRecord[lightID];
      removeLight(light);
   }
}

export function getLightPosition(lightIdx: number): Point {
   const light = lights[lightIdx];
   const lightID = lightIDs[lightIdx];
   
   const attachedRenderPartID = lightToRenderPartRecord[lightID];
   if (typeof attachedRenderPartID !== "undefined") {
      const renderPart = Board.renderPartRecord[attachedRenderPartID];
      const offset = light.position;

      const x = renderPart.renderPosition.x + rotateXAroundOrigin(offset.x, offset.y, renderPart.rotation + renderPart.totalParentRotation);
      const y = renderPart.renderPosition.y + rotateYAroundOrigin(offset.x, offset.y, renderPart.rotation + renderPart.totalParentRotation);
      return new Point(x, y);
   }

   const attachedEntityID = lightToEntityRecord[lightID];
   if (typeof attachedEntityID !== "undefined") {
      const attachedEntity = Board.entityRecord[attachedEntityID];
      if (typeof attachedEntity !== "undefined") {
         const offset = light.position;
         
         const x = attachedEntity.renderPosition.x + rotateXAroundOrigin(offset.x, offset.y, attachedEntity.rotation);
         const y = attachedEntity.renderPosition.y + rotateYAroundOrigin(offset.x, offset.y, attachedEntity.rotation);
         return new Point(x, y);
      }
   }

   return light.position;
}