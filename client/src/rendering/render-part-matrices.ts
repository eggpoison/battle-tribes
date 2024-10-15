import { EntityRenderInfo } from "../Entity";
import { createIdentityMatrix, Matrix3x3, matrixMultiplyInPlace, overrideWithRotationMatrix } from "./matrices";
import { Settings } from "battletribes-shared/settings";
import { RenderParent, RenderThing } from "../render-parts/render-parts";
import { getEntityRenderLayer } from "../render-layers";
import { renderLayerIsChunkRendered, updateChunkRenderedEntity } from "./webgl/chunked-entity-rendering";
import { getEntityRenderInfo } from "../world";
import { Hitbox } from "../../../shared/src/boxes/boxes";
import { EntityID } from "../../../shared/src/entities";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { PhysicsComponentArray } from "../entity-components/server-components/PhysicsComponent";

let dirtyEntities = new Array<EntityID>();

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

const scaleMatrix = (matrix: Matrix3x3, sx: number, sy: number): void => {
   const a00 = sx;
   const a01 = 0;
   const a02 = 0;
   const a10 = 0;
   const a11 = sy;
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

export function translateMatrix(matrix: Matrix3x3, tx: number, ty: number): void {
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

export function registerDirtyEntity(entity: EntityID): void {
   dirtyEntities.push(entity);
}

export function removeEntityFromDirtyArray(entity: EntityID): void {
   const idx = dirtyEntities.indexOf(entity);
   if (idx !== -1) {
      dirtyEntities.splice(idx, 1);
   }
}

export function updateEntityRenderPosition(renderInfo: EntityRenderInfo, frameProgress: number): void {
   const renderPosition = renderInfo.renderPosition;
   const transformComponent = TransformComponentArray.getComponent(renderInfo.associatedEntity);
   renderPosition.x = transformComponent.position.x;
   renderPosition.y = transformComponent.position.y;

   if (PhysicsComponentArray.hasComponent(renderInfo.associatedEntity)) {
      const physicsComponent = PhysicsComponentArray.getComponent(renderInfo.associatedEntity);
      
      renderPosition.x += physicsComponent.selfVelocity.x * frameProgress * Settings.I_TPS;
      renderPosition.y += physicsComponent.selfVelocity.y * frameProgress * Settings.I_TPS;
   }

   // Shake
   if (renderInfo.shakeAmount > 0) {
      const direction = 2 * Math.PI * Math.random();
      renderPosition.x += renderInfo.shakeAmount * Math.sin(direction);
      renderPosition.y += renderInfo.shakeAmount * Math.cos(direction);
   }
}

const calculateAndOverrideEntityModelMatrix = (renderInfo: EntityRenderInfo): void => {
   // Rotate
   const transformComponent = TransformComponentArray.getComponent(renderInfo.associatedEntity);
   overrideWithRotationMatrix(renderInfo.modelMatrix, transformComponent.rotation);

   // Translate
   translateMatrix(renderInfo.modelMatrix, renderInfo.renderPosition.x, renderInfo.renderPosition.y);
}

const calculateAndOverrideRenderThingMatrix = (thing: RenderThing): void => {
   const matrix = thing.modelMatrix;

   // Rotation
   overrideWithRotationMatrix(matrix, thing.rotation);
   
   // Scale
   const scale = thing.scale;
   scaleMatrix(matrix, scale * thing.flipXMultiplier, scale);
   
   // @Speed: Can probably get rid of this flip multiplication by doing the translation before scaling
   let tx = thing.offset.x * thing.flipXMultiplier;
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

const calculateHitboxMatrix = (entityModelMatrix: Matrix3x3, hitbox: Hitbox): Matrix3x3 => {
   const matrix = createIdentityMatrix();;

   // Rotation
   overrideWithRotationMatrix(matrix, hitbox.box.relativeRotation);
   
   // Scale
   const scale = hitbox.box.scale;
   scaleMatrix(matrix, scale, scale);
   
   // @Speed: Can probably get rid of this flip multiplication by doing the translation before scaling
   let tx = hitbox.box.offset.x;
   let ty = hitbox.box.offset.y;
   
   // Translation
   translateMatrix(matrix, tx, ty);

   matrixMultiplyInPlace(entityModelMatrix, matrix);
   return matrix;
}

export function renderParentIsHitbox(parent: RenderParent): parent is Hitbox {
   return parent !== null && typeof (parent as Hitbox).mass !== "undefined";
}

export function updateRenderPartMatrices(frameProgress: number): void {
   // @Bug: I don't think this will account for cases where the game is updated less than 60 times a second.
   // To fix: temporarily set Settings.TPS to like 10 or something and then fix the subsequent slideshow
   for (let i = 0; i < dirtyEntities.length; i++) {
      const entity = dirtyEntities[i];
      const renderInfo = getEntityRenderInfo(entity);
      
      const numRenderThings = renderInfo.allRenderThings.length;
      
      updateEntityRenderPosition(renderInfo, frameProgress);
      calculateAndOverrideEntityModelMatrix(renderInfo);

      const entityRenderPosition = renderInfo.renderPosition;
      
      for (let j = 0; j < numRenderThings; j++) {
         const thing = renderInfo.allRenderThings[j];

         // Model matrix for the render part
         calculateAndOverrideRenderThingMatrix(thing);

         if (thing.inheritParentRotation) {
            let parentModelMatrix: Matrix3x3;
            if (renderParentIsHitbox(thing.parent)) {
               // @Speed?
               parentModelMatrix = calculateHitboxMatrix(renderInfo.modelMatrix, thing.parent);
            } else {
               parentModelMatrix = thing.parent !== null ? thing.parent.modelMatrix : renderInfo.modelMatrix;
            }
            matrixMultiplyInPlace(parentModelMatrix, thing.modelMatrix);
         } else {
            translateMatrix(thing.modelMatrix, entityRenderPosition.x, entityRenderPosition.y);
         }
      }

      const renderLayer = getEntityRenderLayer(entity);
      if (renderLayerIsChunkRendered(renderLayer)) {
         updateChunkRenderedEntity(renderInfo, renderLayer);
      }

      renderInfo.isDirty = false;
   }

   // Reset dirty entities
   dirtyEntities.length = 0;
}