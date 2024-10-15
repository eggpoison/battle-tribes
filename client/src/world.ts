import { EntityID, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import Board from "./Board";
import Chunk from "./Chunk";
import Entity, { EntityRenderInfo } from "./Entity";
import { getComponentArrays } from "./entity-components/ComponentArray";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import Layer from "./Layer";
import { addEntityToRenderHeightMap } from "./rendering/webgl/entity-rendering";

export const layers = new Array<Layer>();

let currentLayer: Layer;

const entityRecord: Partial<Record<number, Entity>> = {};
const entityTypes: Partial<Record<EntityID, EntityType>> = {};
const entitySpawnTicks: Partial<Record<EntityID, number>> = {};
const entityLayers: Partial<Record<EntityID, Layer>> = {};
const entityRenderInfos: Partial<Record<EntityID, EntityRenderInfo>> = {};

export function addLayer(layer: Layer): void {
   layers.push(layer);
}

export function setCurrentLayer(layerIdx: number): void {
   currentLayer = layers[layerIdx];
}

export function getCurrentLayer(): Layer {
   return currentLayer;
}

export function getEntityAgeTicks(entity: EntityID): number {
   if (typeof entitySpawnTicks[entity] === "undefined") {
      throw new Error();
   }
   return Board.serverTicks - entitySpawnTicks[entity]!;
}

export function getEntityLayer(entity: EntityID): Layer {
   return entityLayers[entity]!;
}

export function getEntityType(entity: EntityID): EntityType {
   const entityType = entityTypes[entity];
   if (typeof entityType === "undefined") {
      throw new Error("Entity '" + entity + "' does not exist");
   }
   return entityType;
}

export function getEntityRenderInfo(entity: EntityID): EntityRenderInfo {
   return entityRenderInfos[entity]!;
}

export function entityExists(entity: EntityID): boolean {
   return typeof entityLayers[entity] !== "undefined";
}

// @Temporary
export function getEntityByID(entityID: number): Entity | undefined {
   return entityRecord[entityID];
}

export function registerBasicEntityInfo(entity: Entity, entityType: EntityType, spawnTicks: number, layer: Layer, renderInfo: EntityRenderInfo): void {
   entityRecord[entity.id] = entity;
   entityTypes[entity.id] = entityType;
   entitySpawnTicks[entity.id] = spawnTicks;
   entityLayers[entity.id] = layer;
   entityRenderInfos[entity.id] = renderInfo;
}

export function registerEntityRenderInfo(entity: EntityID, renderInfo: EntityRenderInfo): void {
   entityRenderInfos[entity] = renderInfo;
}

export function addEntity(entity: Entity): void {
   entity.callOnLoadFunctions();

   // If the entity has first spawned in, call any spawn functions
   const ageTicks = getEntityAgeTicks(entity.id);
   if (ageTicks === 0) {
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (componentArray.hasComponent(entity.id) && typeof componentArray.onSpawn !== "undefined") {
            const component = componentArray.getComponent(entity.id);
            componentArray.onSpawn(component, entity.id);
         }
      }
   }

   // @Temporary? useless now?
   const renderInfo = getEntityRenderInfo(entity.id);
   addEntityToRenderHeightMap(renderInfo);

   const layer = getEntityLayer(entity.id);
   layer.addEntityForRendering(entity.id);
}

export function removeEntity(entityID: EntityID, isDeath: boolean): void {
   const entity = getEntityByID(entityID)!;
   const layer = getEntityLayer(entity.id);
   layer.removeEntity(entity.id);

   if (isDeath) {
      entity.die();
   }
   entity.remove();

   const componentArrays = getComponentArrays();

   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (typeof componentArray.onRemove !== "undefined" && componentArray.hasComponent(entityID)) {
         componentArray.onRemove(entityID);
      }
   }

   // Remove from component arrays
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (componentArray.hasComponent(entity.id)) {
         componentArray.removeComponent(entity.id);
      }
   }

   delete entityRecord[entity.id];
   delete entityTypes[entity.id];
   delete entitySpawnTicks[entity.id];
   delete entityLayers[entity.id];
   delete entityRenderInfos[entity.id];
}

export function removeBasicEntityInfo(entity: EntityID): void {
   delete entityRecord[entity];
   delete entityTypes[entity];
   delete entitySpawnTicks[entity];
   delete entityLayers[entity];
   delete entityRenderInfos[entity];
}

export function changeEntityLayer(entity: EntityID, newLayer: Layer): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const previousLayer = getEntityLayer(entity);

   previousLayer.removeEntity(entity);
   newLayer.addEntityForRendering(entity);

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
            chunk.removeEntity(entity);
            transformComponent.chunks.delete(chunk);

            const newChunk = newLayer.getChunk(chunkX, chunkY);
            newChunk.addEntity(entity);
            newChunks.add(newChunk);
         }
      }
   }
   transformComponent.chunks.clear();
   for (const chunk of newChunks) {
      transformComponent.chunks.add(chunk);
   }

   entityLayers[entity] = newLayer;
}