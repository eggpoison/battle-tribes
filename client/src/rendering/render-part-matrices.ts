import Entity from "../Entity";
import { Matrix3x3, matrixMultiplyInPlace, overrideWithIdentityMatrix, overrideWithRotationMatrix } from "./matrices";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { renderPartIsTextured, RenderThing, thingIsRenderPart } from "../render-parts/render-parts";
import Board from "../Board";
import { getEntityRenderLayer } from "../render-layers";
import { renderLayerIsChunkRendered, updateChunkedEntityData, updateChunkRenderedEntity } from "./webgl/chunked-entity-rendering";

let dirtyEntities = new Array<Entity>();

/* ------------------------ */
/* Matrix Utility Functions */
/* ------------------------ */

const overrideWithScaleMatrix = (matrix: Matrix3x3, sx: number, sy: number): void => {
   matrix[0] = sx;
   matrix[1] = 0;
   matrix[2] = 0;
   matrix[3] = 0;
   matrix[4] = sy;
   matrix[5] = 0;
   matrix[6] = 0;
   matrix[7] = 0;
   matrix[8] = 1;
}

const rotateMatrix = (matrix: Matrix3x3, rotation: number): void => {
   const sin = Math.sin(rotation);
   const cos = Math.cos(rotation);

   const a00 = cos;
   const a01 = -sin;
   const a02 = 0;
   const a10 = sin;
   const a11 = cos;
   const a12 = 0;
   const a20 = 0;
   const a21 = 0;
   const a22 = 1;

   const b00 = matrix[0];
   const b01 = matrix[1];
   const b02 = matrix[2];
   const b10 = matrix[3];
   const b11 = matrix[4];
   const b12 = matrix[5];
   const b20 = matrix[6];
   const b21 = matrix[7];
   const b22 = matrix[8];

   matrix[0] = b00 * a00 + b01 * a10 + b02 * a20;
   matrix[1] = b00 * a01 + b01 * a11 + b02 * a21;
   matrix[2] = b00 * a02 + b01 * a12 + b02 * a22;
   matrix[3] = b10 * a00 + b11 * a10 + b12 * a20;
   matrix[4] = b10 * a01 + b11 * a11 + b12 * a21;
   matrix[5] = b10 * a02 + b11 * a12 + b12 * a22;
   matrix[6] = b20 * a00 + b21 * a10 + b22 * a20;
   matrix[7] = b20 * a01 + b21 * a11 + b22 * a21;
   matrix[8] = b20 * a02 + b21 * a12 + b22 * a22;
}

const translateMatrix = (matrix: Matrix3x3, tx: number, ty: number): void => {
   const a00 = 1;
   const a01 = 0;
   const a02 = 0;
   const a10 = 0;
   const a11 = 1;
   const a12 = 0;
   const a20 = tx;
   const a21 = ty;
   const a22 = 1;

   const b00 = matrix[0];
   const b01 = matrix[1];
   const b02 = matrix[2];
   const b10 = matrix[3];
   const b11 = matrix[4];
   const b12 = matrix[5];
   const b20 = matrix[6];
   const b21 = matrix[7];
   const b22 = matrix[8];

   matrix[0] = b00 * a00 + b01 * a10 + b02 * a20;
   matrix[1] = b00 * a01 + b01 * a11 + b02 * a21;
   matrix[2] = b00 * a02 + b01 * a12 + b02 * a22;
   matrix[3] = b10 * a00 + b11 * a10 + b12 * a20;
   matrix[4] = b10 * a01 + b11 * a11 + b12 * a21;
   matrix[5] = b10 * a02 + b11 * a12 + b12 * a22;
   matrix[6] = b20 * a00 + b21 * a10 + b22 * a20;
   matrix[7] = b20 * a01 + b21 * a11 + b22 * a21;
   matrix[8] = b20 * a02 + b21 * a12 + b22 * a22;
}

export function registerDirtyEntity(entity: Entity): void {
   dirtyEntities.push(entity);
}

export function removeEntityFromDirtyArray(entity: Entity): void {
   const idx = dirtyEntities.indexOf(entity);
   if (idx !== -1) {
      dirtyEntities.splice(idx, 1);
   }
}

const updateEntityRenderPosition = (entity: Entity, frameProgress: number): void => {
   const renderPosition = entity.renderPosition;
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   renderPosition.x = transformComponent.position.x;
   renderPosition.y = transformComponent.position.y;

   if (entity.hasServerComponent(ServerComponentType.physics)) {
      const physicsComponent = entity.getServerComponent(ServerComponentType.physics);
      
      renderPosition.x += physicsComponent.selfVelocity.x * frameProgress * Settings.I_TPS;
      renderPosition.y += physicsComponent.selfVelocity.y * frameProgress * Settings.I_TPS;
   }

   // Shake
   if (entity.shakeAmount > 0) {
      const direction = 2 * Math.PI * Math.random();
      renderPosition.x += entity.shakeAmount * Math.sin(direction);
      renderPosition.y += entity.shakeAmount * Math.cos(direction);
   }
}

const calculateAndOverrideEntityModelMatrix = (entity: Entity): void => {
   // Rotate
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   overrideWithRotationMatrix(entity.modelMatrix, transformComponent.rotation);

   // Translate
   translateMatrix(entity.modelMatrix, entity.renderPosition.x, entity.renderPosition.y);
}

// @Speed: this ends up being slows as fuck with all the property accesses and external functions
// @Cleanup: Copy and paste. combine with entity function.
const calculateAndOverrideRenderThingMatrix = (thing: RenderThing): void => {
   const matrix = thing.modelMatrix;
   
   // Scale
   const scale = thing.scale;
   overrideWithScaleMatrix(matrix, scale * (thing.flipX ? -1 : 1), scale);
   
   // Rotation
   rotateMatrix(matrix, thing.rotation);

   let tx = thing.offset.x;
   let ty = thing.offset.y;

   // Shake
   if (thing.shakeAmount > 0) {
      const direction = 2 * Math.PI * Math.random();
      tx += thing.shakeAmount * Math.sin(direction);
      ty += thing.shakeAmount * Math.cos(direction);
   }
   
   // Translation
   translateMatrix(matrix, tx, ty);
}

export function updateRenderPartMatrices(frameProgress: number): void {
   for (let i = 0; i < dirtyEntities.length; i++) {
      const entity = dirtyEntities[i];
      // @Temporary?
      if (typeof Board.entityRecord[entity.id] === "undefined") {
         throw new Error(entity.id.toString());
      }
      
      const numRenderThings = entity.allRenderThings.length;
      
      // If the entity has added or removed render parts, recreate the data arrays
      if (numRenderThings !== entity.depthData.length) {
         entity.depthData = new Float32Array(numRenderThings);
         entity.textureArrayIndexData = new Float32Array(numRenderThings);
         entity.tintData = new Float32Array(3 * numRenderThings);
         entity.opacityData = new Float32Array(numRenderThings);
         entity.modelMatrixData = new Float32Array(9 * numRenderThings);
      }
      

      
      updateEntityRenderPosition(entity, frameProgress);
      calculateAndOverrideEntityModelMatrix(entity);

      const entityRenderPosition = entity.renderPosition;
      
      for (let j = 0; j < numRenderThings; j++) {
         const thing = entity.allRenderThings[j];

         // Model matrix for the render part
         calculateAndOverrideRenderThingMatrix(thing);

         if (thing.inheritParentRotation) {
            const parentModelMatrix = thing.parent !== null ? thing.parent.modelMatrix : entity.modelMatrix;
            matrixMultiplyInPlace(parentModelMatrix, thing.modelMatrix);
         } else {
            translateMatrix(thing.modelMatrix, entityRenderPosition.x, entityRenderPosition.y);
         }
      }

      const renderLayer = getEntityRenderLayer(entity);
      if (renderLayerIsChunkRendered(renderLayer)) {
         updateChunkRenderedEntity(entity, renderLayer);
      }
   }

   // @Cleanup: this isn't to do with matrices, so should rename this file/function
   updateChunkedEntityData();
   
   // Reset dirty entities
   // @Speed: Garbage collection. An individual entity rarely switches between being dirty/undirty
   while (dirtyEntities.length > 0) {
      const entity = dirtyEntities[0];
      entity.isDirty = false;
      // @Speed: this will be very slow. shifts the whole array down each time
      dirtyEntities.splice(0, 1);
   }
}