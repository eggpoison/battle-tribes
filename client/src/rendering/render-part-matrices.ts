import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { matrixMultiplyInPlace, overrideWithIdentityMatrix, overrideWithRotationMatrix, overrideWithScaleMatrix, rotateMatrix, translateMatrix } from "./matrices";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { renderPartIsTextured, RenderThing, thingIsRenderPart } from "../render-parts/render-parts";
import Board from "../Board";
import { getEntityRenderLayer } from "../render-layers";
import { renderLayerIsChunkRendered, updateChunkedEntityData, updateChunkRenderedEntity } from "./webgl/chunked-entity-rendering";
import { EntityType } from "webgl-test-shared/dist/entities";

let dirtyEntities = new Array<Entity>();

export function registerDirtyEntity(entity: Entity): void {
   dirtyEntities.push(entity);
}

export function removeEntityFromDirtyArray(entity: Entity): void {
   const idx = dirtyEntities.indexOf(entity);
   if (idx !== -1) {
      dirtyEntities.splice(idx, 1);
   }
}

const calculateEntityRenderPosition = (entity: Entity, frameProgress: number): Point => {
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   const renderPosition = transformComponent.position.copy();

   if (entity.hasServerComponent(ServerComponentType.physics)) {
      const physicsComponent = entity.getServerComponent(ServerComponentType.physics);
      
      renderPosition.x += physicsComponent.velocity.x * frameProgress * Settings.I_TPS;
      renderPosition.y += physicsComponent.velocity.y * frameProgress * Settings.I_TPS;
   }

   // Shake
   if (entity.shakeAmount > 0) {
      const direction = 2 * Math.PI * Math.random();
      renderPosition.x += entity.shakeAmount * Math.sin(direction);
      renderPosition.y += entity.shakeAmount * Math.cos(direction);
   }

   return renderPosition;
}

const calculateAndOverrideEntityModelMatrix = (entity: Entity, frameProgress: number): void => {
   // Rotate
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   overrideWithRotationMatrix(entity.modelMatrix, transformComponent.rotation);

   // Translate
   const renderPosition = calculateEntityRenderPosition(entity, frameProgress);
   translateMatrix(entity.modelMatrix, renderPosition.x, renderPosition.y);
}

// @Cleanup: Copy and paste. combine with entity function.
const calculateAndOverrideRenderThingMatrix = (thing: RenderThing): void => {
   // Scale
   if (thingIsRenderPart(thing)) {
      const scaleX = thing.scale * (renderPartIsTextured(thing) && thing.flipX ? -1 : 1);
      const scaleY = thing.scale;
      overrideWithScaleMatrix(thing.modelMatrix, scaleX, scaleY);
   } else {
      overrideWithIdentityMatrix(thing.modelMatrix);
   }
   
   // Rotation
   rotateMatrix(thing.modelMatrix, thing.rotation);

   // Translation
   translateMatrix(thing.modelMatrix, thing.offset.x, thing.offset.y);
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
      
      calculateAndOverrideEntityModelMatrix(entity, frameProgress);

      // @Speed: Garbage collection
      const renderPosition = calculateEntityRenderPosition(entity, frameProgress);
      entity.renderPosition = renderPosition;
      
      for (let j = 0; j < numRenderThings; j++) {
         const thing = entity.allRenderThings[j];

         // Model matrix for the render part
         calculateAndOverrideRenderThingMatrix(thing);

         if (thing.inheritParentRotation) {
            const parentModelMatrix = thing.parent !== null ? thing.parent.modelMatrix : entity.modelMatrix;
            matrixMultiplyInPlace(parentModelMatrix, thing.modelMatrix);
         } else {
            translateMatrix(thing.modelMatrix, renderPosition.x, renderPosition.y);
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