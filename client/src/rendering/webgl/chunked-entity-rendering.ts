import { Settings } from "battletribes-shared/settings";
import { NUM_RENDER_LAYERS, RenderLayer } from "../../render-layers";
import { EntityID } from "battletribes-shared/entities";
import Entity from "../../Entity";
import { TransformComponentArray } from "../../entity-components/TransformComponent";
import { clearEntityInVertexData, EntityRenderingVars, getEntityRenderingProgram, setEntityInVertexData } from "./entity-rendering";
import Camera from "../../Camera";
import { gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";

type ChunkedRenderLayer = typeof CHUNKED_RENDER_LAYERS[number];

type RenderLayerChunkDataRecord = Record<ChunkedRenderLayer, Partial<Record<number, ChunkData>>>;

interface ChunkData {
   readonly entityIDToBufferIndexRecord: Partial<Record<EntityID, number>>;
   readonly bufferIndexToEntityIDRecord: Partial<Record<number, EntityID>>;
   readonly vertexData: Float32Array;
   readonly indexData: Uint16Array;
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

interface RenderLayerModifyInfo {
   readonly modifiedIndices: Set<number>;
   modifyInfoRecord: Partial<Record<number, ChunkModifyInfo>>;
}

const CHUNKED_RENDER_LAYERS = [RenderLayer.grass] as const;

const CHUNKED_LAYER_INFO_RECORD: Record<ChunkedRenderLayer, ChunkedRenderLayerInfo> = {
   [RenderLayer.grass]: {
      maxEntitiesPerChunk: 500,
      maxRenderPartsPerEntity: 5
   }
};

// Create initial data
const renderLayerChunkDataRecord: RenderLayerChunkDataRecord = (() => {
   const record: Partial<RenderLayerChunkDataRecord> = {};
   for (const renderLayer of CHUNKED_RENDER_LAYERS) {
      record[renderLayer] = {};
   }
   return record as RenderLayerChunkDataRecord;
})();

// Each render layer contains a set of which chunks have been modified
let modifiedChunkIndicesArray = new Array<RenderLayerModifyInfo>();
for (let i = 0; i < NUM_RENDER_LAYERS; i++) {
   modifiedChunkIndicesArray.push({
      modifiedIndices: new Set(),
      modifyInfoRecord: {}
   });
}

export function renderLayerIsChunkRendered(renderLayer: RenderLayer): renderLayer is ChunkedRenderLayer {
   return CHUNKED_RENDER_LAYERS.includes(renderLayer as ChunkedRenderLayer);
}

export function createEntityRenderedChunkData(chunkIdx: number): void {
   for (const renderLayer of CHUNKED_RENDER_LAYERS) {
      const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];
      const maxRenderParts = renderLayerInfo.maxEntitiesPerChunk * renderLayerInfo.maxRenderPartsPerEntity;

      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      
      const vertexData = new Float32Array(maxRenderParts * 4 * EntityRenderingVars.ATTRIBUTES_PER_VERTEX);
      
      const vertexBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(3, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(4, 1, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   
      gl.vertexAttribPointer(5, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(6, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(7, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 14 * Float32Array.BYTES_PER_ELEMENT);
      
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      gl.enableVertexAttribArray(2);
      gl.enableVertexAttribArray(3);
      gl.enableVertexAttribArray(4);
      gl.enableVertexAttribArray(5);
      gl.enableVertexAttribArray(6);
      gl.enableVertexAttribArray(7);

      const indexData = new Uint16Array(maxRenderParts * 6);
      for (let i = 0; i < maxRenderParts; i++) {
         const indicesDataOffset = i * 6;

         indexData[indicesDataOffset] = i * 4;
         indexData[indicesDataOffset + 1] = i * 4 + 1;
         indexData[indicesDataOffset + 2] = i * 4 + 2;
         indexData[indicesDataOffset + 3] = i * 4 + 2;
         indexData[indicesDataOffset + 4] = i * 4 + 1;
         indexData[indicesDataOffset + 5] = i * 4 + 3;
      }
   
      const indexBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

      const data: ChunkData = {
         entityIDToBufferIndexRecord: {},
         bufferIndexToEntityIDRecord: {},
         vertexData: vertexData,
         indexData: indexData,
         vertexBuffer: vertexBuffer,
         indexBuffer: indexBuffer,
         vao: vao
      };
    
      renderLayerChunkDataRecord[renderLayer][chunkIdx] = data;
   }

   gl.bindVertexArray(null);
}

export function removeEntityRenderedChunkData(chunkX: number, chunkY: number): void {
   const chunkIdx = getChunkIndex(chunkX, chunkY);
   
   for (const renderLayer of CHUNKED_RENDER_LAYERS) {
      delete renderLayerChunkDataRecord[renderLayer][chunkIdx];
   }
}

const getChunkIndex = (chunkX: number, chunkY: number): number => {
   return chunkY * Settings.BOARD_SIZE + chunkX;
}

const getEntityChunkIndex = (entity: Entity): number => {
   const transformComponent = TransformComponentArray.getComponent(entity.id);

   const chunkX = Math.floor(transformComponent.position.x / Settings.CHUNK_UNITS);
   const chunkY = Math.floor(transformComponent.position.y / Settings.CHUNK_UNITS);

   return getChunkIndex(chunkX, chunkY);
}

const getFreeSpaceInChunk = (chunkData: ChunkData, renderLayer: ChunkedRenderLayer): number => {
   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   for (let idx = 0; idx < renderLayerInfo.maxEntitiesPerChunk; idx++) {
      const occupyingEntityID = chunkData.bufferIndexToEntityIDRecord[idx];
      if (typeof occupyingEntityID === "undefined") {
         return idx;
      }
   }

   throw new Error("Exceeded max entities (" + renderLayerInfo.maxEntitiesPerChunk + ") in chunk for render layer " + renderLayer + ".");
}

const registerBufferChange = (renderLayer: ChunkedRenderLayer, chunkIdx: number, firstRenderPartIdx: number, lastRenderPartIdx: number): void => {
   const renderLayerModifyInfo = modifiedChunkIndicesArray[renderLayer];
   renderLayerModifyInfo.modifiedIndices.add(chunkIdx);
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
         info.lastModifiedRenderPartIdx = lastRenderPartIdx;
      }
   }
}

export function registerChunkRenderedEntity(entity: Entity, renderLayer: ChunkedRenderLayer): void {
   const chunkDatas = renderLayerChunkDataRecord[renderLayer];
   const chunkIdx = getEntityChunkIndex(entity);
   let chunkData = chunkDatas[chunkIdx];
   if (typeof chunkData === "undefined") {
      createEntityRenderedChunkData(chunkIdx);
      chunkData = chunkDatas[chunkIdx]!;
   }

   const bufferIndex = getFreeSpaceInChunk(chunkData, renderLayer);
   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   registerBufferChange(renderLayer, chunkIdx, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity + entity.allRenderThings.length - 1);

   chunkData.bufferIndexToEntityIDRecord[bufferIndex] = entity.id;
   chunkData.entityIDToBufferIndexRecord[entity.id] = bufferIndex;

   // Set data
   const renderPartIdx = bufferIndex * renderLayerInfo.maxRenderPartsPerEntity;
   setEntityInVertexData(entity, chunkData.vertexData, chunkData.indexData, renderPartIdx);
}

export function removeChunkRenderedEntity(entity: Entity, renderLayer: ChunkedRenderLayer): void {
   const chunkDatas = renderLayerChunkDataRecord[renderLayer];
   const chunkIdx = getEntityChunkIndex(entity);
   const chunkData = chunkDatas[chunkIdx];
   if (typeof chunkData === "undefined") {
      throw new Error();
   }

   const bufferIndex = chunkData.entityIDToBufferIndexRecord[entity.id];
   if (typeof bufferIndex === "undefined") {
      throw new Error();
   }

   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   registerBufferChange(renderLayer, chunkIdx, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity + entity.allRenderThings.length - 1);

   // Clear data
   const renderPartIdx = bufferIndex * renderLayerInfo.maxRenderPartsPerEntity;
   clearEntityInVertexData(entity, chunkData.vertexData, renderPartIdx);
   
   delete chunkData.bufferIndexToEntityIDRecord[bufferIndex];
   delete chunkData.entityIDToBufferIndexRecord[entity.id];

   // @Incomplete: If no entities are left, remove the chunk
}

export function updateChunkRenderedEntity(entity: Entity, renderLayer: ChunkedRenderLayer): void {
   const chunkDatas = renderLayerChunkDataRecord[renderLayer];
   const chunkIdx = getEntityChunkIndex(entity);
   const chunkData = chunkDatas[chunkIdx];
   if (typeof chunkData === "undefined") {
      throw new Error();
   }

   const bufferIndex = chunkData.entityIDToBufferIndexRecord[entity.id];
   if (typeof bufferIndex === "undefined") {
      throw new Error();
   }

   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];

   registerBufferChange(renderLayer, chunkIdx, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity, bufferIndex * renderLayerInfo.maxRenderPartsPerEntity + entity.allRenderThings.length - 1);

   const renderPartIdx = bufferIndex * renderLayerInfo.maxRenderPartsPerEntity;
   setEntityInVertexData(entity, chunkData.vertexData, chunkData.indexData, renderPartIdx);
}

export function updateChunkedEntityData(): void {
   for (let renderLayer = 0; renderLayer < modifiedChunkIndicesArray.length; renderLayer++) {
      const renderLayerModifyInfo = modifiedChunkIndicesArray[renderLayer];
      if (renderLayerModifyInfo.modifiedIndices.size === 0) {
         continue;
      }

      for (const chunkIdx of renderLayerModifyInfo.modifiedIndices) {
         const modifyInfo = renderLayerModifyInfo.modifyInfoRecord[chunkIdx];
         if (typeof modifyInfo === "undefined") {
            throw new Error();
         }
         
         const chunkData = renderLayerChunkDataRecord[renderLayer as ChunkedRenderLayer][chunkIdx]!;

         const dstByteOffset = modifyInfo.firstModifiedRenderPartIdx * 4 * EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
         const srcOffset = modifyInfo.firstModifiedRenderPartIdx * EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
         const length = (modifyInfo.lastModifiedRenderPartIdx - modifyInfo.firstModifiedRenderPartIdx + 1) * EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
         
         gl.bindVertexArray(chunkData.vao);
         gl.bindBuffer(gl.ARRAY_BUFFER, chunkData.vertexBuffer);
         gl.bufferSubData(gl.ARRAY_BUFFER, dstByteOffset, chunkData.vertexData, srcOffset, length);

         // gl.bufferSubData(gl.ARRAY_BUFFER, 0, chunkData.vertexData);
      }

      renderLayerModifyInfo.modifiedIndices.clear();
      renderLayerModifyInfo.modifyInfoRecord = {};
   }

   gl.bindVertexArray(null);
}

export function renderChunkedEntities(renderLayer: ChunkedRenderLayer): void {
   const renderLayerInfo = CHUNKED_LAYER_INFO_RECORD[renderLayer];
   const chunkDataArray = renderLayerChunkDataRecord[renderLayer];

   const textureAtlas = getEntityTextureAtlas();
   
   const program = getEntityRenderingProgram();
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);
   
   for (let chunkX = Camera.minVisibleChunkX; chunkX <= Camera.maxVisibleChunkX; chunkX++) {
      for (let chunkY = Camera.minVisibleChunkY; chunkY <= Camera.maxVisibleChunkY; chunkY++) {
         const chunkIdx = getChunkIndex(chunkX, chunkY);
         const chunkData = chunkDataArray[chunkIdx];
         if (typeof chunkData === "undefined") {
            continue;
         }

         gl.bindVertexArray(chunkData.vao);
         gl.drawElements(gl.TRIANGLES, renderLayerInfo.maxEntitiesPerChunk * renderLayerInfo.maxRenderPartsPerEntity * 6, gl.UNSIGNED_SHORT, 0);
      }
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}