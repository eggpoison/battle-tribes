import { EntityRenderInfo, updateEntityRenderInfoRenderData } from "../EntityRenderInfo";
import { createIdentityMatrix, createTranslationMatrix, Matrix3x2, matrixMultiplyInPlace } from "./matrices";
import { ServerComponentType, Entity, assert, getAngleDiff, lerp, Point, randAngle, slerp, Settings } from "webgl-test-shared";
import { RenderPart, renderParentIsHitbox } from "../render-parts/render-parts";
import { renderLayerIsChunkRendered, updateChunkRenderedEntity } from "./webgl/chunked-entity-rendering";
import { entityExists, getEntityRenderInfo } from "../world";
import { gl } from "../webgl";
import { getHitboxVelocity, Hitbox } from "../hitboxes";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { playerInstance } from "../player";
import { EntitySnapshot } from "../networking/packet-snapshots";
import { currentSnapshot, nextSnapshot } from "../game";

// @Cleanup: file name

// @HACK i've only kept this dirty array around for hacky reasons. when i make the rework where the client works off sent render parts this should go away.
let dirtyEntityRenderInfos = new Set<EntityRenderInfo>();

/* ------------------------ */
/* Matrix Utility Functions */
/* ------------------------ */

const overrideWithScaleMatrix = (matrix: Matrix3x2, sx: number, sy: number): void => {
   matrix[0] = sx;
   matrix[1] = 0;
   matrix[2] = 0;
   matrix[3] = sy;
   matrix[4] = 0;
   matrix[5] = 0;
}

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

// @Cleanup: This should probably be a function stored on the render part
export function getRenderPartRenderPosition(renderPart: RenderPart): Point {
   const matrix = renderPart.modelMatrix;
   
   const x = matrix[4];
   const y = matrix[5];

   // @Garbage
   return new Point(x, y);
}
// @Copynpaste
export function getMatrixPosition(matrix: Matrix3x2): Point {
   const x = matrix[4];
   const y = matrix[5];

   // @Garbage
   return new Point(x, y);
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

const overrideMatrix = (sourceMatrix: Readonly<Matrix3x2>, targetMatrix: Matrix3x2): void => {
   targetMatrix[0] = sourceMatrix[0];
   targetMatrix[1] = sourceMatrix[1];
   targetMatrix[2] = sourceMatrix[2];
   targetMatrix[3] = sourceMatrix[3];
   targetMatrix[4] = sourceMatrix[4];
   targetMatrix[5] = sourceMatrix[5];
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

export function registerDirtyRenderInfo(renderInfo: EntityRenderInfo): void {
   renderInfo.renderPartsAreDirty = true;
   dirtyEntityRenderInfos.add(renderInfo);
}

export function undirtyRenderInfo(renderInfo: EntityRenderInfo): void {
   dirtyEntityRenderInfos.delete(renderInfo);
}

const calculateAndOverrideRenderThingMatrix = (thing: RenderPart): void => {
   const matrix = thing.modelMatrix;

   // Rotation
   overrideWithRotationMatrix(matrix, thing.angle);
   
   // Scale
   const scale = thing.scale;
   scaleMatrix(matrix, scale * thing.flipXMultiplier, scale);
   
   // @Speed: Can probably get rid of this flip multiplication by doing the translation before scaling
   let tx = thing.offset.x * thing.flipXMultiplier;
   let ty = thing.offset.y;

   // Shake
   if (thing.shakeAmount > 0) {
      const direction = randAngle();
      tx += thing.shakeAmount * Math.sin(direction);
      ty += thing.shakeAmount * Math.cos(direction);
   }
   
   // Translation
   translateMatrix(matrix, tx, ty);
}

const getHitboxDataFromEntityData = (hitbox: Hitbox, entityData: EntitySnapshot): Hitbox => {
   for (const data of entityData.serverComponentData.get(ServerComponentType.transform)!.hitboxes) {
      if (data.localID === hitbox.localID) {
         return data;
      }
   }
   throw new Error();
}

const getHitboxSnapshotDatas = (hitbox: Hitbox): [Hitbox, Hitbox] => {
   const currentEntityData = currentSnapshot.entities.get(hitbox.entity);
   assert(typeof currentEntityData !== "undefined");
   const currentHitboxData = getHitboxDataFromEntityData(hitbox, currentEntityData);

   const nextEntityData = nextSnapshot.entities.get(hitbox.entity);
   const nextHitboxData = typeof nextEntityData !== "undefined" ? getHitboxDataFromEntityData(hitbox, nextEntityData) : currentHitboxData;

   return [currentHitboxData, nextHitboxData];
}

const calculateHitboxMatrix = (hitbox: Hitbox, tickInterp: number): Matrix3x2 => {
   // @HACK we know/calculated this previously when we had to find tickInterp...
   let usesClientInterp = entityUsesClientInterp(hitbox.entity);
   // @HACK cuz we sometimes create imaginary render parts e.g. to show selection outlines, they won't be in the snapshots!
   if (!currentSnapshot.entities.has(hitbox.entity)) {
      // So that it doesn't go through the getHitboxData path
      usesClientInterp = true;
   }
   
   // @HACK the optional shit
   const [currentHitboxData, nextHitboxData] = !usesClientInterp ? getHitboxSnapshotDatas(hitbox) : [undefined, undefined];
   
   const matrix = createIdentityMatrix();

   const scale = hitbox.box.scale;
   overrideWithScaleMatrix(matrix, scale * (hitbox.box.flipX ? -1 : 1), scale);

   // Rotation
   let angle: number;
   if (usesClientInterp) {
      // we don't want the relative angular velocity here, we want to interpolate the ACTUAL angle not the local thing.
      // @HACK? doing this check cuz it doesn't make sense for the player instance to have angular velocity cuz the angle is tightly controlled.
      const angularVelocityTick = hitbox.entity === playerInstance ? 0 : getAngleDiff(hitbox.previousAngle, hitbox.box.angle);
      angle = hitbox.box.angle + (angularVelocityTick + hitbox.angularAcceleration * Settings.DT_S * Settings.DT_S) * tickInterp;
   } else {
      angle = slerp(currentHitboxData!.box.angle, nextHitboxData!.box.angle, tickInterp);
   }
   rotateMatrix(matrix, angle);
   // overrideWithRotationMatrix(matrix, hitbox.box.angle);
   
   // Scale
   // @INCOMPLETE?
   // const scale = hitbox.box.scale;
   // scaleMatrix(matrix, scale * (hitbox.box.flipX ? -1 : 1), scale);
   // scaleMatrix(matrix, scale, scale);
   
   // Translation
   let tx: number;
   let ty: number;
   if (usesClientInterp) {
      // @Garbage
      const velocity = getHitboxVelocity(hitbox);
      tx = hitbox.box.position.x + velocity.x * tickInterp * Settings.DT_S;
      ty = hitbox.box.position.y + velocity.y * tickInterp * Settings.DT_S;
   } else {
      tx = lerp(currentHitboxData!.box.position.x, nextHitboxData!.box.position.x, tickInterp);
      ty = lerp(currentHitboxData!.box.position.y, nextHitboxData!.box.position.y, tickInterp);
   }
   translateMatrix(matrix, tx, ty);

   return matrix;
}

export function calculateHitboxRenderPosition(hitbox: Hitbox, tickInterp: number): Point {
   const matrix = calculateHitboxMatrix(hitbox, tickInterp);
   return getMatrixPosition(matrix);
}

export function translateEntityRenderParts(renderInfo: EntityRenderInfo, tx: number, ty: number): void {
   for (const thing of renderInfo.renderPartsByZIndex) {
      const matrix = createTranslationMatrix(tx, ty);
      matrixMultiplyInPlace(thing.modelMatrix, matrix);
      overrideMatrix(matrix, thing.modelMatrix);
   }
}

const cleanRenderPartModelMatrix = (renderPart: RenderPart, tickInterp: number): void => {
   // Model matrix for the render part
   calculateAndOverrideRenderThingMatrix(renderPart);

   let parentRotation: number;
   let parentModelMatrix: Readonly<Matrix3x2>;
   if (renderParentIsHitbox(renderPart.parent)) {
      // @Speed? @Garbage: Should override
      parentModelMatrix = calculateHitboxMatrix(renderPart.parent, tickInterp);
      parentRotation = renderPart.parent.box.angle;
   } else {
      parentModelMatrix = renderPart.parent.modelMatrix;
      parentRotation = renderPart.parent.angle;
   }

   // @Speed: If the thing doesn't inherit its' parents rotation, undo the rotation before the matrix is applied.
   // But would be faster to branch the whole logic based on the inheritParentRotation flag, instead of cancelling out the rotation step
   if (!renderPart.inheritParentRotation) {
      rotateMatrix(renderPart.modelMatrix, -parentRotation);
   }
   
   matrixMultiplyInPlace(parentModelMatrix, renderPart.modelMatrix);

   for (const child of renderPart.children) {
      cleanRenderPartModelMatrix(child, tickInterp);
   }
}

export function cleanEntityRenderParts(renderInfo: EntityRenderInfo, tickInterp: number): void {
   // @copynpaste?
   for (const renderPart of renderInfo.rootRenderParts) {
      cleanRenderPartModelMatrix(renderPart, tickInterp);
   }
}

export function cleanEntityRenderInfo(renderInfo: EntityRenderInfo, tickInterp: number): void {
   for (const renderPart of renderInfo.rootRenderParts) {
      cleanRenderPartModelMatrix(renderPart, tickInterp);
   }

   if (renderLayerIsChunkRendered(renderInfo.renderLayer)) {
      updateChunkRenderedEntity(renderInfo, renderInfo.renderLayer);
   } else {
      updateEntityRenderInfoRenderData(renderInfo);
   }

   renderInfo.renderPartsAreDirty = false;
}

export function entityUsesClientInterp(entity: Entity): boolean {
   // @HACK ideally we should be able to throw an error here, this should never be the case!! but it is rn in the case of players holding a placeable item
   if (!TransformComponentArray.hasComponent(entity)) {
      // console.warn("big poopoo town @ le function entityUsesClientInterp!!")
      return false;
   }
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const entityHitbox = transformComponent.hitboxes[0];
   const rootEntity = entityHitbox.rootEntity;
   return rootEntity === playerInstance;
}

export function getEntityTickInterp(entity: Entity, clientTickInterp: number, serverTickInterp: number): number {
   return entityUsesClientInterp(entity) ? clientTickInterp : serverTickInterp;
}

export function updateRenderPartMatrices(clientTickInterp: number, serverTickInterp: number): void {
   // Do this before so that binding buffers during the loop doesn't mess up any previously bound vertex array.
   gl.bindVertexArray(null);

   for (const entity of nextSnapshot.interpolatingEntities) {
      // @Hack? I send entity data even if the entity is removed that tick, so while we have to interpolate to that deleted data, also if currentSnapshot = nextSnapshot then it sometimes tries to interpolate a deleted entity.
      if (entityExists(entity)) {
         const renderInfo = getEntityRenderInfo(entity);
         const tickInterp = getEntityTickInterp(renderInfo.entity, clientTickInterp, serverTickInterp);
         cleanEntityRenderInfo(renderInfo, tickInterp);
      }
   }

   // @HACK
   // @CRASH potential crash, cuz cleanEntityRenderInfo is now intertwined with the interpolating entities and if an entity is dirtied which doesn't appear in that array then it will probs crash
   for (const renderInfo of dirtyEntityRenderInfos) {
      const tickInterp = getEntityTickInterp(renderInfo.entity, clientTickInterp, serverTickInterp);
      cleanEntityRenderInfo(renderInfo, tickInterp);
   }

   // Reset dirty entities
   dirtyEntityRenderInfos.clear();
}