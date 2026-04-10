import { EntityRenderObject, recalculateRenderObjectVertexData } from "../EntityRenderObject";
import { createIdentityMatrix, Matrix3x2, matrixMultiplyInPlace } from "./matrices";
import { ServerComponentType, Entity, assert, getAngleDiff, lerp, Point, randAngle, slerp, Settings, _point, Mutable } from "webgl-test-shared";
import { RenderPart, renderParentIsHitbox } from "../render-parts/render-parts";
import { renderLayerIsChunkRendered, updateChunkRenderedEntity } from "./webgl/chunked-entity-rendering";
import { entityExists, getEntityRenderObject } from "../world";
import { getHitboxVelocity, Hitbox } from "../hitboxes";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { playerInstance } from "../player";
import { EntitySnapshot } from "../networking/packet-snapshots";
import { currentSnapshot, nextSnapshot } from "../game";
import { EntityServerComponentData, getEntityServerComponentTypes, getServerComponentData, getTransformComponentData } from "../entity-component-types";
import { getRenderPartShakeAmount } from "../render-parts/render-part-shake-amounts";

// @HACK i've only kept this dirty array around for hacky reasons. when i make the rework where the client works off sent render parts this should go away.
const dirtyClientInterpEntities = new Array<Entity>();
const dirtyServerInterpEntities = new Array<Entity>();

/* ------------------------ */
/* Matrix Utility Functions */
/* ------------------------ */
// @Location should all be in the matrices file

const rotateMatrix = (matrix: Matrix3x2, rotation: number): void => {
   const sin = Math.sin(rotation);
   const cos = Math.cos(rotation);

   const negSin = -sin;

   const b00 = matrix[0];
   const b01 = matrix[1];
   const b10 = matrix[2];
   const b11 = matrix[3];
   const b20 = matrix[4];
   const b21 = matrix[5];

   matrix[0] = b00 * cos + b01 * sin;
   matrix[1] = b00 * negSin + b01 * cos;
   matrix[2] = b10 * cos + b11 * sin;
   matrix[3] = b10 * negSin + b11 * cos;
   matrix[4] = b20 * cos + b21 * sin;
   matrix[5] = b20 * negSin + b21 * cos;
}

export function getMatrixPosition(matrix: Matrix3x2): void {
   (_point as Mutable<Point>).x = matrix[4];
   (_point as Mutable<Point>).y = matrix[5];
}

export function getRenderPartRenderPosition(renderPart: RenderPart): void {
   const matrix = renderPart.modelMatrix;
   (_point as Mutable<Point>).x = matrix[4];
   (_point as Mutable<Point>).y = matrix[5];
}

const scaleMatrix = (matrix: Matrix3x2, sx: number, sy: number): void => {
   matrix[0] *= sx;
   matrix[1] *= sy;
   matrix[2] *= sx;
   matrix[3] *= sy;
   matrix[4] *= sx;
   matrix[5] *= sy;
}

export function translateMatrix(matrix: Matrix3x2, tx: number, ty: number): void {
   matrix[4] += tx;
   matrix[5] += ty;
}

const overrideWithRotationMatrix = (matrix: Matrix3x2, rotation: number): void => {
   const sin = Math.sin(rotation);
   const cos = Math.cos(rotation);

   matrix[0] = cos;
   matrix[1] = -sin;
   matrix[2] = sin;
   matrix[3] = cos;
   matrix[4] = 0;
   matrix[5] = 0;
}

export function registerDirtyRenderObject(entity: Entity, renderObject: EntityRenderObject): void {
   if (renderObject.renderPartsAreDirty) {
      return;
   }
   renderObject.renderPartsAreDirty = true;
   
   if (renderObject.isClientInterp) {
      dirtyClientInterpEntities.push(entity);
   } else {
      dirtyServerInterpEntities.push(entity);
   }
}

export function undirtyRenderObject(entity: Entity, renderObject: EntityRenderObject): void {
   if (!renderObject.renderPartsAreDirty) {
      return;
   }

   // Don't need to set renderPartsAreDirty to false cuz the entity is being destroyed anyway when this is called
   
   if (renderObject.isClientInterp) {
      const idx = dirtyClientInterpEntities.indexOf(entity);
      assert(idx !== -1);

      // Swap with last element then remove last element
      const lastEntity = dirtyClientInterpEntities[dirtyClientInterpEntities.length - 1];
      dirtyClientInterpEntities[idx] = lastEntity;
      dirtyClientInterpEntities.pop();
   } else {
      const idx = dirtyServerInterpEntities.indexOf(entity);
      assert(idx !== -1);

      // Swap with last element then remove last element
      const lastEntity = dirtyServerInterpEntities[dirtyServerInterpEntities.length - 1];
      dirtyServerInterpEntities[idx] = lastEntity;
      dirtyServerInterpEntities.pop();
   }
}

const recalculateRenderPartModelMatrix = (renderPart: RenderPart): void => {
   const matrix = renderPart.modelMatrix;

   // Rotation
   overrideWithRotationMatrix(matrix, renderPart.angle);
   
   // Scale
   const scale = renderPart.scale;
   if (renderPart.scale !== 1) {
      scaleMatrix(matrix, scale * renderPart.flipXMultiplier, scale);
   }
   
   // @Speed: Can probably get rid of this flip multiplication by doing the translation before scaling
   let tx = renderPart.offsetX * renderPart.flipXMultiplier;
   let ty = renderPart.offsetY;

   // Shake
   const shakeAmount = getRenderPartShakeAmount(renderPart);
   if (shakeAmount > 0) {
      const direction = randAngle();
      tx += shakeAmount * Math.sin(direction);
      ty += shakeAmount * Math.cos(direction);
   }
   
   // Translation
   translateMatrix(matrix, tx, ty);
}

// @SPEED @GARBAGE
const getHitboxDataFromEntityData = (hitbox: Hitbox, entityData: EntitySnapshot): Hitbox => {
   const serverComponentTypes = getEntityServerComponentTypes(entityData.entityType);
   const transformComponentData = getServerComponentData(entityData.componentData, serverComponentTypes, ServerComponentType.transform);
   for (const data of transformComponentData.hitboxes) {
      if (data.localID === hitbox.localID) {
         return data;
      }
   }
   throw new Error();
}

const matrixMultiplyByInterpolatedHitbox = (hitbox: Hitbox, modelMatrix: Matrix3x2, interp: number): void => {
   const currentEntityData = currentSnapshot.entities.get(hitbox.entity);

   // If the client manually dirtied the render object, default to just calculating it
   if (currentEntityData === undefined) {
      matrixMultiplyByCalculatedHitbox(hitbox, modelMatrix, interp);
      return;
   }
   const currentHitboxData = getHitboxDataFromEntityData(hitbox, currentEntityData);

   const nextEntityData = nextSnapshot.entities.get(hitbox.entity);
   const nextHitboxData = nextEntityData !== undefined ? getHitboxDataFromEntityData(hitbox, nextEntityData) : currentHitboxData;

   // Rotation
   const angle = slerp(currentHitboxData.box.angle, nextHitboxData.box.angle, interp);
   rotateMatrix(modelMatrix, angle);
   
   // Scale
   const scale = hitbox.box.scale;
   scaleMatrix(modelMatrix, scale * (hitbox.box.flipX ? -1 : 1), scale);
   
   // Translation
   const tx = lerp(currentHitboxData.box.position.x, nextHitboxData.box.position.x, interp);
   const ty = lerp(currentHitboxData.box.position.y, nextHitboxData.box.position.y, interp);
   translateMatrix(modelMatrix, tx, ty);
}

const matrixMultiplyByCalculatedHitbox = (hitbox: Hitbox, modelMatrix: Matrix3x2, interp: number): void => {
   // Rotation
   // we don't want the relative angular velocity here, we want to interpolate the ACTUAL angle not the local thing.
   // @HACK? doing this check cuz it doesn't make sense for the player instance to have angular velocity cuz the angle is tightly controlled.
   const angularVelocityTick = hitbox.entity === playerInstance ? 0 : getAngleDiff(hitbox.previousAngle, hitbox.box.angle);
   // @Investigate: should it multiply by DT*DT, or just DT??
   const angle = hitbox.box.angle + (angularVelocityTick + hitbox.angularAcceleration * Settings.DT_S * Settings.DT_S) * interp;
   rotateMatrix(modelMatrix, angle);
   
   // Scale
   const scale = hitbox.box.scale;
   scaleMatrix(modelMatrix, scale * (hitbox.box.flipX ? -1 : 1), scale);

   // Translation
   getHitboxVelocity(hitbox);
   const tx = hitbox.box.position.x + _point.x * interp * Settings.DT_S;
   const ty = hitbox.box.position.y + _point.y * interp * Settings.DT_S;
   translateMatrix(modelMatrix, tx, ty);
}

const cleanClientInterpModelMatrix = (renderPart: RenderPart, clientInterp: number): void => {
   recalculateRenderPartModelMatrix(renderPart);

   // @Speed: If the thing doesn't inherit its' parents rotation, undo the rotation before the matrix is applied.
   // But would be faster to branch the whole logic based on the inheritParentRotation flag, instead of cancelling out the rotation step
   // @CLEANUP: is extremely weird for this to be done here.
   if (!renderPart.inheritParentRotation) {
      let parentRotation: number;
      if (renderParentIsHitbox(renderPart.parent)) {
         parentRotation = renderPart.parent.box.angle;
      } else {
         parentRotation = renderPart.parent.angle;
      }

      rotateMatrix(renderPart.modelMatrix, -parentRotation);
   }
   
   const parent = renderPart.parent;
   if (renderParentIsHitbox(parent)) {
      matrixMultiplyByCalculatedHitbox(parent, renderPart.modelMatrix, clientInterp);
   } else {
      matrixMultiplyInPlace(parent.modelMatrix, renderPart.modelMatrix);
   }

   for (const child of renderPart.children) {
      cleanClientInterpModelMatrix(child, clientInterp);
   }
}

const cleanServerInterpModelMatrix = (renderPart: RenderPart, serverInterp: number): void => {
   recalculateRenderPartModelMatrix(renderPart);

   // @Speed: If the thing doesn't inherit its' parents rotation, undo the rotation before the matrix is applied.
   // But would be faster to branch the whole logic based on the inheritParentRotation flag, instead of cancelling out the rotation step
   // @CLEANUP: is extremely weird for this to be done here.
   if (!renderPart.inheritParentRotation) {
      let parentRotation: number;
      if (renderParentIsHitbox(renderPart.parent)) {
         parentRotation = renderPart.parent.box.angle;
      } else {
         parentRotation = renderPart.parent.angle;
      }

      rotateMatrix(renderPart.modelMatrix, -parentRotation);
   }
   
   const parent = renderPart.parent;
   if (renderParentIsHitbox(parent)) {
      matrixMultiplyByInterpolatedHitbox(parent, renderPart.modelMatrix, serverInterp);
   } else {
      matrixMultiplyInPlace(parent.modelMatrix, renderPart.modelMatrix);
   }

   for (const child of renderPart.children) {
      cleanServerInterpModelMatrix(child, serverInterp);
   }
}

const cleanClientInterpRenderObject = (renderObject: EntityRenderObject, clientInterp: number): void => {
   for (const renderPart of renderObject.rootRenderParts) {
      cleanClientInterpModelMatrix(renderPart, clientInterp);
   }

   if (renderLayerIsChunkRendered(renderObject.renderLayer)) {
      updateChunkRenderedEntity(renderObject, renderObject.renderLayer);
   } else {
      recalculateRenderObjectVertexData(renderObject);
   }

   renderObject.renderPartsAreDirty = false;
}

const cleanServerInterpRenderObject = (renderObject: EntityRenderObject, serverInterp: number): void => {
   for (const renderPart of renderObject.rootRenderParts) {
      cleanServerInterpModelMatrix(renderPart, serverInterp);
   }

   // Update the render data
   if (renderLayerIsChunkRendered(renderObject.renderLayer)) {
      updateChunkRenderedEntity(renderObject, renderObject.renderLayer);
   } else {
      recalculateRenderObjectVertexData(renderObject);
   }

   renderObject.renderPartsAreDirty = false;
}

export function updateRenderPartMatrices(clientInterp: number, serverInterp: number): void {
   for (let i = 0, len = dirtyClientInterpEntities.length; i < len; i++) {
      const entity = dirtyClientInterpEntities[i];
      // @Hack? I send entity data even if the entity is removed that tick, so while we have to interpolate to that deleted data, also if currentSnapshot = nextSnapshot then it sometimes tries to interpolate a deleted entity.
      if (entityExists(entity)) {
         // @Speed: Would be good to not have to do this at all - and then just store the render objects instead of entities!
         const renderObject = getEntityRenderObject(entity);
         cleanClientInterpRenderObject(renderObject, clientInterp);
      }
   }

   for (let i = 0, len = dirtyServerInterpEntities.length; i < len; i++) {
      const entity = dirtyServerInterpEntities[i];
      // @Hack? I send entity data even if the entity is removed that tick, so while we have to interpolate to that deleted data, also if currentSnapshot = nextSnapshot then it sometimes tries to interpolate a deleted entity.
      if (entityExists(entity)) {
         // @Speed: Would be good to not have to do this at all - and then just store the render objects instead of entities!
         const renderObject = getEntityRenderObject(entity);
         cleanServerInterpRenderObject(renderObject, serverInterp);
      }
   }
   
   dirtyClientInterpEntities.length = 0;
   dirtyServerInterpEntities.length = 0;
}

/* -------------------------------- */
/* Utility functions used elsewhere */
/* -------------------------------- */

export function entityUsesClientInterp(entity: Entity): boolean {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const entityHitbox = transformComponent.hitboxes[0];
   const rootEntity = entityHitbox.rootEntity;
   return rootEntity === playerInstance;
}

// @Cleanup @Hack @Location !!
export function entityDataUsesClientInterp(serverComponentData: EntityServerComponentData): boolean {
   const transformComponentData = getTransformComponentData(serverComponentData);
   
   const entityHitbox = transformComponentData.hitboxes[0];
   const rootEntity = entityHitbox.rootEntity;
   return rootEntity === playerInstance;
}

export function calculateHitboxRenderPosition(hitbox: Hitbox, clientInterp: number, serverInterp: number): Readonly<Point> {
   // @Garbage!
   const matrix = createIdentityMatrix();

   const renderObject = getEntityRenderObject(hitbox.entity);
   if (renderObject.isClientInterp) {
      matrixMultiplyByCalculatedHitbox(hitbox, matrix, clientInterp);
   } else {
      matrixMultiplyByInterpolatedHitbox(hitbox, matrix, serverInterp);
   }
   
   getMatrixPosition(matrix);
   return _point;
}

export function cleanEntityRenderParts(renderObject: EntityRenderObject, clientInterp: number, serverInterp: number): void {
   if (renderObject.isClientInterp) {
      for (const renderPart of renderObject.rootRenderParts) {
         cleanClientInterpModelMatrix(renderPart, clientInterp);
      }
   } else {
      for (const renderPart of renderObject.rootRenderParts) {
         cleanServerInterpModelMatrix(renderPart, serverInterp);
      }
   }
}

export function cleanEntityRenderObject(renderObject: EntityRenderObject, clientInterp: number, serverInterp: number): void {
   if (renderObject.isClientInterp) {
      cleanClientInterpRenderObject(renderObject, clientInterp);
   } else {
      cleanServerInterpRenderObject(renderObject, serverInterp);
   }
}