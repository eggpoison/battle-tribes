import { Settings, Entity, assert } from "webgl-test-shared";
import { NUM_RENDER_LAYERS, RenderLayer } from "../../render-layers";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { clearEntityInVertexData, createEntityRenderData, EntityRenderingVars, getEntityRenderingProgram, setRenderInfoInVertexData } from "./entity-rendering";
import { gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { getEntityLayer, getEntityRenderInfo } from "../../world";
import Layer from "../../Layer";

type ChunkedRenderLayer = typeof CHUNKED_RENDER_LAYERS[number];

export type RenderLayerChunkDataRecord = Record<ChunkedRenderLayer, Partial<Record<number, EntityChunkData>>>;

export interface EntityChunkData {
   numEntities: number;
   readonly entityIDToBufferIndexRecord: Partial<Record<Entity, number>>;
   readonly bufferIndexToEntityIDRecord: Partial<Record<number, Entity>>;
   readonly vertexData: Float32Array;
   readonly vertexBuffer: WebGLBuffer;
   readonly indexBuffer: WebGLBuffer;
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

const CHUNKED_RENDER_LAYERS = [RenderLayer.grass] as const;

const CHUNKED_LAYER_INFO_RECORD: Record<ChunkedRenderLayer, ChunkedRenderLayerInfo> = {
   [RenderLayer.grass]: {
      // @SPEED: For grass, determine the actual max number of entities.
      maxEntitiesPerChunk: 500,
      maxRenderPartsPerEntity: 5
   }
};

/** Creates an empty record */
export function createRenderLayerChunkDataRecord(): RenderLayerChunkDataRecord {
   const record: Partial<RenderLayerChunkDataRecord> = {};
   for (const renderLayer of CHUNKED_RENDER_LAYERS) {
      record[renderLayer] = {};
   }
   return record as RenderLayerChunkDataRecord;
}

export function createVisibleEntityChunkDatas(): Record<ChunkedRenderLayer, Array<EntityChunkData>> {
   const record = {} as Record<ChunkedRenderLayer, Array<EntityChunkData>>;
   for (const renderLayer of CHUNKED_RENDER_LAYERS) {
      record[renderLayer] = [];
   }
   return record;
}

export function createModifiedChunkIndicesArray(): Array<RenderLayerModifyInfo> {
   let modifiedChunkIndicesArray = new Array<RenderLayerModifyInfo>();
   for (let i = 0; i < NUM_RENDER_LAYERS; i++) {
      modifiedChunkIndicesArray.push({
         modifiedChunkIndices: new Set(),
         modifyInfoRecord: {}
      });
   }
   return modifiedChunkIndicesArray;
}

export function renderLayerIsChunkRendered(renderLayer: RenderLayer): renderLayer is ChunkedRenderLayer {
   return CHUNKED_RENDER_LAYERS.includes(renderLayer as ChunkedRenderLayer);
}

function createEntityRenderedChunkData(layer: Layer, chunkIdx: number): void {
   for (const renderLayer of CHUNKED_RENDER_LAYERS) {
      const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];
      const maxRenderParts = renderLayerInfo.maxEntitiesPerChunk * renderLayerInfo.maxRenderPartsPerEntity;

      const entityRenderData = createEntityRenderData(maxRenderParts);

      const data: EntityChunkData = {
         numEntities: 0,
         entityIDToBufferIndexRecord: {},
         bufferIndexToEntityIDRecord: {},
         vertexData: entityRenderData.vertexData,
         vertexBuffer: entityRenderData.vertexBuffer,
         indexBuffer: entityRenderData.indexBuffer,
         vao: entityRenderData.vao
      };
    
      layer.renderLayerChunkDataRecord[renderLayer][chunkIdx] = data;
      layer.visibleEntityChunkDatas[renderLayer].push(data);
   }

   gl.bindVertexArray(null);
}

function removeEntityRenderedChunkData(layer: Layer, chunkIdx: number, chunkData: EntityChunkData): void {
   gl.deleteBuffer(chunkData.vertexBuffer);
   gl.deleteBuffer(chunkData.indexBuffer);
   gl.deleteVertexArray(chunkData.vao);

   for (const renderLayer of CHUNKED_RENDER_LAYERS) {
      delete layer.renderLayerChunkDataRecord[renderLayer][chunkIdx];
      deregisterBufferChange(layer, renderLayer, chunkIdx);
      const idx = layer.visibleEntityChunkDatas[renderLayer].indexOf(chunkData);
      assert(idx !== -1);
      layer.visibleEntityChunkDatas[renderLayer].splice(idx, 1);
   }
}

const getEntityChunkIndex = (renderInfo: EntityRenderInfo): number => {
   // Use the position of the first render part (since this render parts array is being used extensively by this system, while the actual hitbox position isn't accessed at all.)
   const matrix = renderInfo.renderPartsByZIndex[0].modelMatrix;
   
   const x = matrix[4];
   const y = matrix[5];
   
   const chunkX = x >> Settings.CHUNK_UNITS_LOG2;
   const chunkY = y >> Settings.CHUNK_UNITS_LOG2;
   return chunkY * Settings.WORLD_SIZE_CHUNKS + chunkX;
}

const getFreeSpaceInChunk = (chunkData: EntityChunkData, renderLayer: ChunkedRenderLayer): number => {
   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   for (let idx = 0; idx < renderLayerInfo.maxEntitiesPerChunk; idx++) {
      const occupyingEntityID = chunkData.bufferIndexToEntityIDRecord[idx];
      if (typeof occupyingEntityID === "undefined") {
         return idx;
      }
   }

   throw new Error("Exceeded max entities (" + renderLayerInfo.maxEntitiesPerChunk + ") in chunk for render layer " + renderLayer + ".");
}

const registerBufferChange = (layer: Layer, renderLayer: ChunkedRenderLayer, chunkIdx: number, firstRenderPartIdx: number, lastRenderPartIdx: number): void => {
   const renderLayerModifyInfo = layer.modifiedChunkIndicesArray[renderLayer];
   renderLayerModifyInfo.modifiedChunkIndices.add(chunkIdx);
   // @Speed: This function gets called a lot, but the place which uses this data gets called relatively infrequently. So we can remove this check and transfer it to the refresh function.
   if (typeof renderLayerModifyInfo.modifyInfoRecord[chunkIdx] === "undefined") {
      renderLayerModifyInfo.modifyInfoRecord[chunkIdx] = {
         firstModifiedRenderPartIdx: firstRenderPartIdx,
         lastModifiedRenderPartIdx: lastRenderPartIdx
      };
   } else {
      const info = renderLayerModifyInfo.modifyInfoRecord[chunkIdx]!;
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
   delete renderLayerModifyInfo.modifyInfoRecord[chunkIdx]
}

export function registerChunkRenderedEntity(entity: Entity, layer: Layer, renderLayer: ChunkedRenderLayer): void {
   const renderInfo = getEntityRenderInfo(entity);
   
   const chunkDatas = layer.renderLayerChunkDataRecord[renderLayer];
   const chunkIdx = getEntityChunkIndex(renderInfo);
   let chunkData = chunkDatas[chunkIdx];
   if (typeof chunkData === "undefined") {
      createEntityRenderedChunkData(layer, chunkIdx);
      chunkData = chunkDatas[chunkIdx]!;
   }

   const bufferIndex = getFreeSpaceInChunk(chunkData, renderLayer);
   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   registerBufferChange(layer, renderLayer, chunkIdx, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity + renderInfo.renderPartsByZIndex.length - 1);

   chunkData.numEntities++;
   chunkData.bufferIndexToEntityIDRecord[bufferIndex] = entity;
   chunkData.entityIDToBufferIndexRecord[entity] = bufferIndex;

   // Set data
   const renderPartIdx = bufferIndex * renderLayerInfo.maxRenderPartsPerEntity;
   setRenderInfoInVertexData(renderInfo, chunkData.vertexData, renderPartIdx);
}

export function removeChunkRenderedEntity(entity: Entity, layer: Layer, renderLayer: ChunkedRenderLayer): void {
   const renderInfo = getEntityRenderInfo(entity);

   const chunkDatas = layer.renderLayerChunkDataRecord[renderLayer];
   const chunkIdx = getEntityChunkIndex(renderInfo);
   const chunkData = chunkDatas[chunkIdx];
   if (typeof chunkData === "undefined") {
      throw new Error();
   }

   const bufferIndex = chunkData.entityIDToBufferIndexRecord[entity];
   if (typeof bufferIndex === "undefined") {
      throw new Error();
   }

   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   // Clear data
   const renderPartIdx = bufferIndex * renderLayerInfo.maxRenderPartsPerEntity;
   clearEntityInVertexData(renderInfo, chunkData.vertexData, renderPartIdx);
   
   chunkData.numEntities--;
   assert(chunkData.numEntities >= 0);
   delete chunkData.bufferIndexToEntityIDRecord[bufferIndex];
   delete chunkData.entityIDToBufferIndexRecord[entity];

   if (chunkData.numEntities === 0) {
      removeEntityRenderedChunkData(layer, chunkIdx, chunkData);
   } else {
      registerBufferChange(layer, renderLayer, chunkIdx, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity + renderInfo.renderPartsByZIndex.length - 1);
   }
}

export function updateChunkRenderedEntity(renderInfo: EntityRenderInfo, renderLayer: ChunkedRenderLayer): void {
   // @Hack? Feels off
   const layer = getEntityLayer(renderInfo.entity);
   
   const chunkDatas = layer.renderLayerChunkDataRecord[renderLayer];
   const chunkIdx = getEntityChunkIndex(renderInfo);
   const chunkData = chunkDatas[chunkIdx];
   if (typeof chunkData === "undefined") {
      throw new Error();
   }

   const bufferIndex = chunkData.entityIDToBufferIndexRecord[renderInfo.entity];
   if (typeof bufferIndex === "undefined") {
      throw new Error();
   }

   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   registerBufferChange(layer, renderLayer, chunkIdx, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity + renderInfo.renderPartsByZIndex.length - 1);

   const renderPartIdx = bufferIndex * renderLayerInfo.maxRenderPartsPerEntity;
   setRenderInfoInVertexData(renderInfo, chunkData.vertexData, renderPartIdx);
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
         if (typeof modifyInfo === "undefined") {
            throw new Error();
         }
         
         const chunkData = layer.renderLayerChunkDataRecord[renderLayer as ChunkedRenderLayer][chunkIdx]!;

         const dstByteOffset = modifyInfo.firstModifiedRenderPartIdx * 4 * EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
         const srcOffset = modifyInfo.firstModifiedRenderPartIdx * EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
         const length = (modifyInfo.lastModifiedRenderPartIdx - modifyInfo.firstModifiedRenderPartIdx + 1) * EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
         
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

   const textureAtlas = getEntityTextureAtlas();
   
   const program = getEntityRenderingProgram();
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);
   
   for (const chunkData of visibleChunkDatas) {
      gl.bindVertexArray(chunkData.vao);
      // @SPEED: don't always draw the maximum number!!
      gl.drawElements(gl.TRIANGLES, chunkData.numEntities * renderLayerInfo.maxRenderPartsPerEntity * 6, gl.UNSIGNED_SHORT, 0);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}