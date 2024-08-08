import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { matrixMultiplyInPlace, overrideWithRotationMatrix, overrideWithScaleMatrix, rotateMatrix, translateMatrix } from "./matrices";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { RenderPart, renderPartIsTextured } from "../render-parts/render-parts";
import { addEntitiesToBuffer, calculateRenderPartDepth } from "./webgl/entity-rendering";
import { EntityType } from "webgl-test-shared/dist/entities";

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

const calculateAndOverrideEntityModelMatrix = (entity: Entity, frameProgress: number): void => {
   // Rotate
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   overrideWithRotationMatrix(entity.modelMatrix, transformComponent.rotation);

   // Translate
   const renderPosition = calculateEntityRenderPosition(entity, frameProgress);
   translateMatrix(entity.modelMatrix, renderPosition.x, renderPosition.y);
}

// @Cleanup: Copy and paste. combine with entity function.
const calculateAndOverrideRenderPartMatrix = (renderPart: RenderPart): void => {
   // Scale
   const scaleX = renderPart.scale * (renderPartIsTextured(renderPart) && renderPart.flipX ? -1 : 1);
   const scaleY = renderPart.scale;
   overrideWithScaleMatrix(renderPart.modelMatrix, scaleX, scaleY);
   
   // Rotation
   rotateMatrix(renderPart.modelMatrix, renderPart.rotation);

   // Translation
   translateMatrix(renderPart.modelMatrix, renderPart.offset.x, renderPart.offset.y);
}

export function updateRenderPartMatrices(frameProgress: number): void {
   for (let i = 0; i < dirtyEntities.length; i++) {
      const entity = dirtyEntities[i];
      
      const numRenderParts = entity.allRenderParts.length;
      
      // If the entity has added or removed render parts, recreate the data arrays
      if (numRenderParts !== entity.depthData.length) {
         entity.depthData = new Float32Array(numRenderParts);
         entity.textureArrayIndexData = new Float32Array(numRenderParts);
         entity.tintData = new Float32Array(3 * numRenderParts);
         entity.opacityData = new Float32Array(numRenderParts);
         entity.modelMatrixData = new Float32Array(9 * numRenderParts);
      }
      
      calculateAndOverrideEntityModelMatrix(entity, frameProgress);

      let baseTintR = 0;
      let baseTintG = 0;
      let baseTintB = 0;
      for (let j = 0; j < entity.serverComponents.length; j++) {
         const component = entity.serverComponents[j];
         baseTintR += component.tintR;
         baseTintG += component.tintG;
         baseTintB += component.tintB;
      }
      
      const entityDepthData = entity.depthData;
      const entityTextureArrayIndexData = entity.textureArrayIndexData;
      const entityTintData = entity.tintData;
      const entityOpacityData = entity.opacityData;
      const entityModelMatrixData = entity.modelMatrixData;

      for (let j = 0; j < numRenderParts; j++) {
         const renderPart = entity.allRenderParts[j];

         // Model matrix for the render part
         calculateAndOverrideRenderPartMatrix(renderPart);

         if (renderPart.inheritParentRotation) {
            matrixMultiplyInPlace(renderPart.parent.modelMatrix, renderPart.modelMatrix);
         } else {
            const renderPosition = calculateEntityRenderPosition(entity, frameProgress);
            translateMatrix(renderPart.modelMatrix, renderPosition.x, renderPosition.y);
         }
   
         let tintR = baseTintR + renderPart.tintR;
         let tintG = baseTintG + renderPart.tintG;
         let tintB = baseTintB + renderPart.tintB;

         if (!renderPartIsTextured(renderPart)) {
            tintR = renderPart.colour.r;
            tintG = renderPart.colour.g;
            tintB = renderPart.colour.b;
         }

         const textureArrayIndex = renderPartIsTextured(renderPart) ? renderPart.textureArrayIndex : -1;

         renderPart.modelMatrixData[0] = renderPart.modelMatrix[0];
         renderPart.modelMatrixData[1] = renderPart.modelMatrix[1];
         renderPart.modelMatrixData[2] = renderPart.modelMatrix[2];
         renderPart.modelMatrixData[3] = renderPart.modelMatrix[3];
         renderPart.modelMatrixData[4] = renderPart.modelMatrix[4];
         renderPart.modelMatrixData[5] = renderPart.modelMatrix[5];
         renderPart.modelMatrixData[6] = renderPart.modelMatrix[6];
         renderPart.modelMatrixData[7] = renderPart.modelMatrix[7];
         renderPart.modelMatrixData[8] = renderPart.modelMatrix[8];

         entityDepthData[j] = calculateRenderPartDepth(renderPart, entity);

         entityTextureArrayIndexData[j] = textureArrayIndex;
   
         entityTintData[j * 3] = tintR;
         entityTintData[j * 3 + 1] = tintG;
         entityTintData[j * 3 + 2] = tintB;
         
         entityOpacityData[j] = renderPart.opacity;
   
         entityModelMatrixData[j * 9] = renderPart.modelMatrixData[0];
         entityModelMatrixData[j * 9 + 1] = renderPart.modelMatrixData[1];
         entityModelMatrixData[j * 9 + 2] = renderPart.modelMatrixData[2];
         entityModelMatrixData[j * 9 + 3] = renderPart.modelMatrixData[3];
         entityModelMatrixData[j * 9 + 4] = renderPart.modelMatrixData[4];
         entityModelMatrixData[j * 9 + 5] = renderPart.modelMatrixData[5];
         entityModelMatrixData[j * 9 + 6] = renderPart.modelMatrixData[6];
         entityModelMatrixData[j * 9 + 7] = renderPart.modelMatrixData[7];
         entityModelMatrixData[j * 9 + 8] = renderPart.modelMatrixData[8];
      }
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