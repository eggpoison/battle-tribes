import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { Matrix3x3, createRotationMatrix, createScaleMatrix, createTranslationMatrix, matrixMultiply } from "./matrices";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { RenderPart, renderPartIsTextured } from "../render-parts/render-parts";
import Board from "../Board";
import { addEntitiesToBuffer, calculateRenderPartDepth } from "./webgl/entity-rendering";

let dirtyEntities = new Array<Entity>();

export function registerDirtyEntity(entity: Entity): void {
   dirtyEntities.push(entity);
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

const calculateEntityModelMatrix = (entity: Entity, frameProgress: number): Matrix3x3 => {
   // Rotate
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   let model = createRotationMatrix(transformComponent.rotation);

   // Translate
   const renderPosition = calculateEntityRenderPosition(entity, frameProgress);
   const translation = createTranslationMatrix(renderPosition.x, renderPosition.y);
   model = matrixMultiply(translation, model);

   return model;
}

const calculateEntityTranslationMatrix = (entity: Entity, frameProgress: number): Matrix3x3 => {
   const renderPosition = calculateEntityRenderPosition(entity, frameProgress);
   return createTranslationMatrix(renderPosition.x, renderPosition.y);
}

// @Cleanup: Copy and paste. combine with entity function.
const calculateRenderPartMatrix = (renderPart: RenderPart): Matrix3x3 => {
   // Scale
   const scaleX = renderPart.scale * (renderPartIsTextured(renderPart) && renderPart.flipX ? -1 : 1);
   const scaleY = renderPart.scale;
   let model = createScaleMatrix(scaleX, scaleY);
   
   // @Speed: Garbage collection
   // Rotation
   const rotationMatrix = createRotationMatrix(renderPart.rotation);
   model = matrixMultiply(rotationMatrix, model);

   // @Speed: Garbage collection
   // Translation
   const translation = createTranslationMatrix(renderPart.offset.x, renderPart.offset.y);
   model = matrixMultiply(translation, model);

   return model;
}

export function updateRenderPartMatrices(frameProgress: number): void {
   // @Incomplete: investigate
   // depthData.set

   for (let i = 0; i < dirtyEntities.length; i++) {
      const entity = dirtyEntities[i];

      const numRenderParts = entity.allRenderParts.length;

      const depthData = new Float32Array(numRenderParts);
      const textureArrayIndexData = new Float32Array(numRenderParts);
      const tintData = new Float32Array(3 * numRenderParts);
      const opacityData = new Float32Array(numRenderParts);
      const modelMatrixData = new Float32Array(9 * numRenderParts);
      
      const entityModelMatrix = calculateEntityModelMatrix(entity, frameProgress);
      entity.modelMatrix = entityModelMatrix;

      for (let j = 0; j < numRenderParts; j++) {
         const renderPart = entity.renderPartsHierarchicalArray[j];

         const modelMatrix = calculateRenderPartMatrix(renderPart);

         if (renderPart.inheritParentRotation) {
            renderPart.modelMatrix = matrixMultiply(renderPart.parent.modelMatrix, modelMatrix);
         } else {
            const entityModelMatrix = calculateEntityTranslationMatrix(entity, frameProgress);
            // Base the matrix on the entity's model matrix without rotation
            renderPart.modelMatrix = matrixMultiply(entityModelMatrix, modelMatrix);
         }
   
         const depth = calculateRenderPartDepth(renderPart, entity);

         let tintR = entity.tintR + renderPart.tintR;
         let tintG = entity.tintG + renderPart.tintG;
         let tintB = entity.tintB + renderPart.tintB;
         if (!renderPartIsTextured(renderPart)) {
            tintR = renderPart.colour.r;
            tintG = renderPart.colour.g;
            tintB = renderPart.colour.b;
         }

         const textureArrayIndex = renderPartIsTextured(renderPart) ? renderPart.textureArrayIndex : -1;

         depthData[j] = depth;

         textureArrayIndexData[j] = textureArrayIndex;
   
         tintData[j * 3] = tintR;
         tintData[j * 3 + 1] = tintG;
         tintData[j * 3 + 2] = tintB;
         
         opacityData[j] = renderPart.opacity;
   
         modelMatrixData[j * 9] = renderPart.modelMatrix[0];
         modelMatrixData[j * 9 + 1] = renderPart.modelMatrix[1];
         modelMatrixData[j * 9 + 2] = renderPart.modelMatrix[2];
         modelMatrixData[j * 9 + 3] = renderPart.modelMatrix[3];
         modelMatrixData[j * 9 + 4] = renderPart.modelMatrix[4];
         modelMatrixData[j * 9 + 5] = renderPart.modelMatrix[5];
         modelMatrixData[j * 9 + 6] = renderPart.modelMatrix[6];
         modelMatrixData[j * 9 + 7] = renderPart.modelMatrix[7];
         modelMatrixData[j * 9 + 8] = renderPart.modelMatrix[8];
      }

      entity.depthData = depthData;
      entity.textureArrayIndexData = textureArrayIndexData;
      entity.tintData = tintData;
      entity.opacityData = opacityData;
      entity.modelMatrixData = modelMatrixData;
   }

   addEntitiesToBuffer(dirtyEntities);

   // Reset dirty entities
   // @Speed: Garbage collection. An individual entity rarely switches between dirty/undirty
   while (dirtyEntities.length > 0) {
      const entity = dirtyEntities[0];
      entity.modelMatrixIsDirty = false;
      dirtyEntities.splice(0, 1);
   }
}