import { EntityID } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import Board from "./Board";
import Chunk from "./Chunk";
import Entity from "./Entity";
import { getComponentArrays } from "./entity-components/ComponentArray";
import { TransformComponentArray } from "./entity-components/TransformComponent";
import Layer from "./Layer";
import { getEntityRenderLayer } from "./render-layers";
import { addRenderable, RenderableType, removeRenderable } from "./rendering/render-loop";
import { removeEntityFromDirtyArray } from "./rendering/render-part-matrices";
import { renderLayerIsChunkRendered, registerChunkRenderedEntity, removeChunkRenderedEntity } from "./rendering/webgl/chunked-entity-rendering";
import { addEntityToRenderHeightMap } from "./rendering/webgl/entity-rendering";

export const layers = new Array<Layer>();

let currentLayer: Layer;

const entityRecord: Partial<Record<number, Entity>> = {};
const entityLayers: Partial<Record<EntityID, Layer>> = {};

export function addLayer(layer: Layer): void {
   layers.push(layer);
}

export function setCurrentLayer(layerIdx: number): void {
   currentLayer = layers[layerIdx];
}

export function getEntityLayer(entity: EntityID): Layer {
   return entityLayers[entity]!;
}

export function entityExists(entity: EntityID): boolean {
   return typeof entityLayers[entity] !== "undefined";
}

// @Temporary
export function getEntityByID(entityID: number): Entity | undefined {
   return entityRecord[entityID];
}

export function registerBasicEntityInfo(entity: Entity, layer: Layer): void {
   entityRecord[entity.id] = entity;
   entityLayers[entity.id] = layer;
}

export function addEntity(entity: Entity): void {
   entity.callOnLoadFunctions();

   // @Temporary? useless now?
   addEntityToRenderHeightMap(entity);

   const renderLayer = getEntityRenderLayer(entity);
   if (renderLayerIsChunkRendered(renderLayer)) {
      registerChunkRenderedEntity(entity, renderLayer);
   } else {
      addRenderable(RenderableType.entity, entity, renderLayer);
   }
}

export function removeEntity(entity: Entity, isDeath: boolean): void {
   const renderLayer = getEntityRenderLayer(entity);
   if (renderLayerIsChunkRendered(renderLayer)) {
      removeChunkRenderedEntity(entity, renderLayer);
   } else {
      removeRenderable(entity, renderLayer);
   }
   removeEntityFromDirtyArray(entity);

   delete entityRecord[entity.id];
   delete entityLayers[entity.id];

   if (isDeath) {
      entity.die();
   }
   entity.remove();

   for (let i = 0; i < entity.components.length; i++) {
      const component = entity.components[i];
      if (typeof component.onRemove !== "undefined") {
         component.onRemove();
      }
   }

   // Remove from component arrays
   const componentArrays = getComponentArrays();
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (componentArray.hasComponent(entity.id)) {
         componentArray.removeComponent(entity.id);
      }
   }
}

export function changeEntityLayer(entity: EntityID, newLayer: Layer): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const previousLayer = getEntityLayer(entity);

   // Remove from all previous chunks and add to new ones
   const newChunks = new Set<Chunk>();
   const minChunkX = Math.max(Math.floor(transformComponent.boundingAreaMinX / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor(transformComponent.boundingAreaMaxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor(transformComponent.boundingAreaMinY / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor(transformComponent.boundingAreaMaxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = previousLayer.getChunk(chunkX, chunkY);

         if (transformComponent.chunks.has(chunk)) {
            chunk.removeEntity(getEntityByID(entity)!);
            transformComponent.chunks.delete(chunk);

            const newChunk = newLayer.getChunk(chunkX, chunkY);
            newChunk.addEntity(getEntityByID(entity)!);
            newChunks.add(newChunk);
         }
      }
   }
   transformComponent.chunks = newChunks;

   entityLayers[entity] = newLayer;
}