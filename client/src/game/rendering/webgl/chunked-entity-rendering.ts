import { Settings, Entity, assert, EntityTypeString, _point } from "webgl-test-shared";
import { RenderLayer } from "../../render-layers";
import { EntityRenderObject } from "../../EntityRenderObject";
import { clearEntityInVertexData, createEntityRenderData, EntityRenderingVar, setRenderObjectInVertexData, setupEntityRendering } from "./entity-rendering";
import { gl } from "../../webgl";
import { getEntityLayer, getEntityRenderObject, getEntityType } from "../../world";
import Layer from "../../Layer";
import { getMatrixPosition } from "../render-part-matrices";

// @Cleanup: Shouldn't this all go off of the entity type not the render layer?

export type ChunkedRenderLayer = typeof CHUNKED_RENDER_LAYERS[number];

export type RenderLayerChunkDataRecord = Record<ChunkedRenderLayer, Partial<Record<number, EntityChunkData>>>;

export interface EntityChunkData {
   numEntities: number;
   readonly entityToBufferIndexRecord: Partial<Record<Entity, number>>;
   readonly bufferIndexToEntityRecord: Uint32Array;
   readonly vertexData: Float32Array;
   readonly vertexBuffer: WebGLBuffer;
   readonly vao: WebGLVertexArrayObject;
}

interface ChunkedRenderLayerInfo {
   readonly maxEntitiesPerChunk: number;
   readonly maxRenderPartsPerEntity: number;
}

interface ChunkModifyInfo {
   firstModifiedRenderPartIdx: number;
   lastModifiedRenderPartIdx: number;
}

export interface RenderLayerModifyInfo {
   readonly modifiedChunkIndices: Set<number>;
   modifyInfoRecord: Partial<Record<number, ChunkModifyInfo>>;
}

export const CHUNKED_RENDER_LAYERS = [RenderLayer.grass] as const;

const CHUNKED_LAYER_INFO_RECORD: Record<ChunkedRenderLayer, ChunkedRenderLayerInfo> = {
   [RenderLayer.grass]: {
      // @SPEED: For grass, determine the actual max number of entities.
      maxEntitiesPerChunk: 500,
      maxRenderPartsPerEntity: 5
   }
};

export function renderLayerIsChunkRendered(renderLayer: RenderLayer): renderLayer is ChunkedRenderLayer {
   return CHUNKED_RENDER_LAYERS.includes(renderLayer as ChunkedRenderLayer);
}

function createEntityRenderedChunkData(layer: Layer, chunkIdx: number): void {
   // @SPEED: Creates for all!!
   for (const renderLayer of CHUNKED_RENDER_LAYERS) {
      const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];
      const maxRenderParts = renderLayerInfo.maxEntitiesPerChunk * renderLayerInfo.maxRenderPartsPerEntity;

      const entityRenderData = createEntityRenderData(maxRenderParts);

      const data: EntityChunkData = {
         numEntities: 0,
         entityToBufferIndexRecord: {},
         bufferIndexToEntityRecord: new Uint32Array(renderLayerInfo.maxEntitiesPerChunk),
         vertexData: entityRenderData.vertexData,
         vertexBuffer: entityRenderData.vertexBuffer,
         vao: entityRenderData.vao
      };
    
      layer.renderLayerChunkDataRecord[renderLayer][chunkIdx] = data;
      layer.visibleEntityChunkDatas[renderLayer].push(data);
   }
}

function removeEntityRenderedChunkData(layer: Layer, chunkIdx: number, chunkData: EntityChunkData): void {
   gl.deleteBuffer(chunkData.vertexBuffer);
   gl.deleteVertexArray(chunkData.vao);

   for (const renderLayer of CHUNKED_RENDER_LAYERS) {
      delete layer.renderLayerChunkDataRecord[renderLayer][chunkIdx];
      deregisterBufferChange(layer, renderLayer, chunkIdx);
      
      const chunkDatas = layer.visibleEntityChunkDatas[renderLayer];
      const idx = chunkDatas.indexOf(chunkData);
      assert(idx !== -1);
      // Swap with the last element to delete
      const lastElement = chunkDatas[chunkDatas.length - 1];
      chunkDatas[idx] = lastElement;
      chunkDatas.pop();
   }
}


const getEntityChunkIndex = (renderObject: EntityRenderObject): number => {
   // Use the position of the first render part (since this render parts array is being used extensively by this system, while the actual hitbox position isn't accessed at all.)
   const matrix = renderObject.renderPartsByZIndex[0].modelMatrix;
   
   getMatrixPosition(matrix);
   
   const chunkX = Math.floor(_point.x / Settings.CHUNK_UNITS);
   const chunkY = Math.floor(_point.y / Settings.CHUNK_UNITS);
   return chunkY * Settings.WORLD_SIZE_CHUNKS + chunkX;
}

const getFreeSpaceInChunk = (chunkData: EntityChunkData, renderLayer: ChunkedRenderLayer): number => {
   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   for (let idx = 0; idx < renderLayerInfo.maxEntitiesPerChunk; idx++) {
      const occupyingEntity = chunkData.bufferIndexToEntityRecord[idx];
      if (occupyingEntity === 0) {
         return idx;
      }
   }

   throw new Error("Exceeded max entities (" + renderLayerInfo.maxEntitiesPerChunk + ") in chunk for render layer " + renderLayer + ".");
}

const registerBufferChange = (layer: Layer, renderLayer: ChunkedRenderLayer, chunkIdx: number, firstRenderPartIdx: number, lastRenderPartIdx: number): void => {
   const renderLayerModifyInfo = layer.modifiedChunkIndicesArray[renderLayer];
   renderLayerModifyInfo.modifiedChunkIndices.add(chunkIdx);
   // @Speed: This function gets called a lot, but the place which uses this data gets called relatively infrequently. So we can remove this check and transfer it to the refresh function.
   if (renderLayerModifyInfo.modifyInfoRecord[chunkIdx] === undefined) {
      renderLayerModifyInfo.modifyInfoRecord[chunkIdx] = {
         firstModifiedRenderPartIdx: firstRenderPartIdx,
         lastModifiedRenderPartIdx: lastRenderPartIdx
      };
   } else {
      const info = renderLayerModifyInfo.modifyInfoRecord[chunkIdx];
      if (firstRenderPartIdx < info.firstModifiedRenderPartIdx) {
         info.firstModifiedRenderPartIdx = firstRenderPartIdx;
      } else if (lastRenderPartIdx > info.lastModifiedRenderPartIdx) {
         // (else if is correct, not if, because an entity will never fully surround another entity it will either be below or above it.)
         info.lastModifiedRenderPartIdx = lastRenderPartIdx;
      }
   }
}

const deregisterBufferChange = (layer: Layer, renderLayer: RenderLayer, chunkIdx: number): void => {
   const renderLayerModifyInfo = layer.modifiedChunkIndicesArray[renderLayer];
   renderLayerModifyInfo.modifiedChunkIndices.delete(chunkIdx);
   delete renderLayerModifyInfo.modifyInfoRecord[chunkIdx];
}

export function registerChunkRenderedEntity(entity: Entity, layer: Layer, renderLayer: ChunkedRenderLayer): void {
   const renderObject = getEntityRenderObject(entity);
   
   const chunkDatas = layer.renderLayerChunkDataRecord[renderLayer];
   const chunkIdx = getEntityChunkIndex(renderObject);
   let chunkData = chunkDatas[chunkIdx];
   if (chunkData === undefined) {
      createEntityRenderedChunkData(layer, chunkIdx);
      chunkData = chunkDatas[chunkIdx]!;
   }

   const bufferIndex = getFreeSpaceInChunk(chunkData, renderLayer);
   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   registerBufferChange(layer, renderLayer, chunkIdx, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity + renderObject.renderPartsByZIndex.length - 1);

   chunkData.numEntities++;
   chunkData.bufferIndexToEntityRecord[bufferIndex] = entity;
   chunkData.entityToBufferIndexRecord[entity] = bufferIndex;

   // Set data
   const renderPartIdx = bufferIndex * renderLayerInfo.maxRenderPartsPerEntity;
   setRenderObjectInVertexData(renderObject, chunkData.vertexData, renderPartIdx);
}

export function removeChunkRenderedEntity(entity: Entity, layer: Layer, renderLayer: ChunkedRenderLayer): void {
   const renderObject = getEntityRenderObject(entity);

   const chunkDataRecord = layer.renderLayerChunkDataRecord[renderLayer];
   const chunkIdx = getEntityChunkIndex(renderObject);
   const chunkData = chunkDataRecord[chunkIdx];
   assert(chunkData !== undefined);

   const bufferIndex = chunkData.entityToBufferIndexRecord[entity];
   assert(bufferIndex !== undefined);

   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   // Clear data
   const renderPartIdx = bufferIndex * renderLayerInfo.maxRenderPartsPerEntity;
   clearEntityInVertexData(chunkData.vertexData, renderPartIdx, renderLayerInfo.maxRenderPartsPerEntity);
   
   chunkData.numEntities--;
   assert(chunkData.numEntities >= 0);
   chunkData.bufferIndexToEntityRecord[bufferIndex] = 0;
   delete chunkData.entityToBufferIndexRecord[entity];

   if (chunkData.numEntities === 0) {
      removeEntityRenderedChunkData(layer, chunkIdx, chunkData);
   } else {
      registerBufferChange(layer, renderLayer, chunkIdx, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity + renderObject.renderPartsByZIndex.length - 1);
   }
}

export function updateChunkRenderedEntity(renderObject: EntityRenderObject, renderLayer: ChunkedRenderLayer): void {
   // @Hack? Feels off
   const layer = getEntityLayer(renderObject.entity);
   
   const chunkDatas = layer.renderLayerChunkDataRecord[renderLayer];
   const chunkIdx = getEntityChunkIndex(renderObject);
   const chunkData = chunkDatas[chunkIdx];
   assert(chunkData !== undefined);

   const bufferIndex = chunkData.entityToBufferIndexRecord[renderObject.entity];
   if (bufferIndex === undefined) {
      console.log(EntityTypeString[getEntityType(renderObject.entity)])
      for (let i = 0; i < 99999; i++) {
         const chunkData = chunkDatas[i];
         if (chunkData === undefined) {
            continue;
         }
         
         const bufferIndex = chunkData.entityToBufferIndexRecord[renderObject.entity];
         if (bufferIndex !== undefined) {
            console.log("YEP COCK!")
         }
      }
      throw new Error();
   }

   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   registerBufferChange(layer, renderLayer, chunkIdx, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity + renderObject.renderPartsByZIndex.length - 1);

   const renderPartIdx = bufferIndex * renderLayerInfo.maxRenderPartsPerEntity;
   setRenderObjectInVertexData(renderObject, chunkData.vertexData, renderPartIdx);
}

/** Registers the changes accumulated across all buffer modifications */
export function refreshChunkedEntityRenderingBuffers(layer: Layer): void {
   for (let renderLayer = 0; renderLayer < layer.modifiedChunkIndicesArray.length; renderLayer++) {
      const renderLayerModifyInfo = layer.modifiedChunkIndicesArray[renderLayer];
      if (renderLayerModifyInfo.modifiedChunkIndices.size === 0) {
         continue;
      }

      for (const chunkIdx of renderLayerModifyInfo.modifiedChunkIndices) {
         const modifyInfo = renderLayerModifyInfo.modifyInfoRecord[chunkIdx];
         if (modifyInfo === undefined) {
            throw new Error();
         }
         
         const chunkData = layer.renderLayerChunkDataRecord[renderLayer as ChunkedRenderLayer][chunkIdx]!;

         const dstByteOffset = modifyInfo.firstModifiedRenderPartIdx * EntityRenderingVar.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
         const srcOffset = modifyInfo.firstModifiedRenderPartIdx * EntityRenderingVar.ATTRIBUTES_PER_VERTEX;
         const length = (modifyInfo.lastModifiedRenderPartIdx - modifyInfo.firstModifiedRenderPartIdx + 1) * EntityRenderingVar.ATTRIBUTES_PER_VERTEX;
         
         gl.bindBuffer(gl.ARRAY_BUFFER, chunkData.vertexBuffer);
         gl.bufferSubData(gl.ARRAY_BUFFER, dstByteOffset, chunkData.vertexData, srcOffset, length);
      }

      renderLayerModifyInfo.modifiedChunkIndices.clear();
      renderLayerModifyInfo.modifyInfoRecord = {};
   }
}

export function renderChunkedEntities(layer: Layer, renderLayer: ChunkedRenderLayer): void {
   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];
   const visibleChunkDatas = layer.visibleEntityChunkDatas[renderLayer];

   setupEntityRendering();

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const renderPartsPerChunk = renderLayerInfo.maxEntitiesPerChunk * renderLayerInfo.maxRenderPartsPerEntity;
   for (let i = 0, len = visibleChunkDatas.length; i < len; i++) {
      const chunkData = visibleChunkDatas[i];
      gl.bindVertexArray(chunkData.vao);
      // @SPEED: don't always draw the maximum number!!
      gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, renderPartsPerChunk);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}