import { Point } from "battletribes-shared/utils";
import Board from "./Board";
import { getEntityByID } from "./world";
import { copyMatrix, createTranslationMatrix, Matrix3x3, matrixMultiplyInPlace } from "./rendering/matrices";
import { translateMatrix } from "./rendering/render-part-matrices";

type LightID = number;

export interface Light {
   readonly offset: Point;
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

export function getLightPositionMatrix(lightIdx: number): Matrix3x3 {
   const light = lights[lightIdx];
   const lightID = lightIDs[lightIdx];
   
   const attachedRenderPartID = lightToRenderPartRecord[lightID];
   if (typeof attachedRenderPartID !== "undefined") {
      const renderPart = Board.renderPartRecord[attachedRenderPartID];

      // @Speed @Copynpaste
      const matrix = createTranslationMatrix(light.offset.x, light.offset.y);
      matrixMultiplyInPlace(renderPart.modelMatrix, matrix);
      // const matrix = copyMatrix(renderPart.modelMatrix);
      // // @Hack: why do we need to rotate the offset?
      // translateMatrix(matrix, light.offset.x, light.offset.y);

      return matrix;
   }

   const attachedEntityID = lightToEntityRecord[lightID];
   if (typeof attachedEntityID !== "undefined") {
      const attachedEntity = getEntityByID(attachedEntityID);
      if (typeof attachedEntity !== "undefined") {
         // @Speed @Copynpaste
         const matrix = createTranslationMatrix(light.offset.x, light.offset.y);
         matrixMultiplyInPlace(attachedEntity.modelMatrix, matrix);

         return matrix;
      }
   }

   // @Incomplete
   // Make "attach light to world" logic
   // return light.offset;
   throw new Error();
}