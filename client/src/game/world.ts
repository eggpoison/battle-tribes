import { Settings, Entity, EntityType, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "./EntityRenderInfo";
import { ComponentArray, getClientComponentArray, getComponentArrays, getServerComponentArray } from "./entity-components/ComponentArray";
import { ServerComponentData } from "./entity-components/components";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import Layer from "./Layer";
import { registerDirtyRenderInfo, undirtyRenderInfo } from "./rendering/render-part-matrices";
import { calculateRenderDepthFromLayer, getEntityRenderLayer } from "./render-layers";
import { ClientComponentType } from "./entity-components/client-component-types";
import { ClientComponentData } from "./entity-components/client-components";
import { removeEntitySounds } from "./sound";
import { currentSnapshot } from "./client";

export const layers = new Array<Layer>();

export let surfaceLayer: Layer;
export let undergroundLayer: Layer;
let currentLayer: Layer;

const entityTypes: Partial<Record<Entity, EntityType>> = {};
const entitySpawnTicks: Partial<Record<Entity, number>> = {};
const entityLayers: Partial<Record<Entity, Layer>> = {};
const entityRenderInfos: Partial<Record<Entity, EntityRenderInfo>> = {};
const entityComponentTypes: Partial<Record<Entity, ReadonlyArray<ServerComponentType>>> = {};

export function addLayer(layer: Layer): void {
   if (layers.length === 0) {
      surfaceLayer = layer;
   } else {
      undergroundLayer = layer;
   }
   
   layers.push(layer);
}

export function setCurrentLayer(layer: Layer): void {
   currentLayer = layer;
}

export function getCurrentLayer(): Layer {
   return currentLayer;
}

export function getEntityAgeTicks(entity: Entity): number {
   if (typeof entitySpawnTicks[entity] === "undefined") {
      throw new Error("Entity " + entity + " doesn't exist");
   }
   return currentSnapshot.tick - entitySpawnTicks[entity]!;
}

export function getEntityLayer(entity: Entity): Layer {
   const layer = entityLayers[entity];
   if (typeof layer === "undefined") {
      throw new Error("Entity " + entity + " doesn't exist");
   }
   return layer;
}

export function getEntityType(entity: Entity): EntityType {
   const entityType = entityTypes[entity];
   if (typeof entityType === "undefined") {
      throw new Error("Entity '" + entity + "' does not exist");
   }
   return entityType;
}

export function getEntityRenderInfo(entity: Entity): EntityRenderInfo {
   return entityRenderInfos[entity]!;
}

export function getEntityComponentTypes(entity: Entity): ReadonlyArray<ServerComponentType> {
   return entityComponentTypes[entity]!;
}

export function entityExists(entity: Entity): boolean {
   return typeof entityLayers[entity] !== "undefined";
}

const registerBasicEntityInfo = (entity: Entity, entityType: EntityType, spawnTicks: number, layer: Layer, renderInfo: EntityRenderInfo, componentTypes: ReadonlyArray<ServerComponentType>): void => {
   entityTypes[entity] = entityType;
   entitySpawnTicks[entity] = spawnTicks;
   entityLayers[entity] = layer;
   entityRenderInfos[entity] = renderInfo;
   entityComponentTypes[entity] = componentTypes;
}

// @Cleanup: location
/** Basically just all the component data used to create an entity. */
export interface EntityComponentData {
   readonly entityType: EntityType;
   readonly serverComponentData: Partial<{
      [T in ServerComponentType]: ServerComponentData<T>;
   }>;
   readonly clientComponentData: Partial<{
      [T in ClientComponentType]: ClientComponentData<T>;
   }>;
}

// @Location
/** Entity creation info, populated with all the data which comprises a full entity. */
export interface EntityCreationInfo {
   readonly entity: Entity;
   readonly entityComponentData: EntityComponentData;
   componentIntermediateInfoRecord: Partial<Record<number, object>>;
   readonly renderInfo: EntityRenderInfo;
}

const getEntityServerComponentTypes = (entityComponentData: EntityComponentData): ReadonlyArray<ServerComponentType> => {
   return Object.keys(entityComponentData.serverComponentData).map(Number);
}
const getEntityClientComponentTypes = (entityComponentData: EntityComponentData): ReadonlyArray<ClientComponentType> => {
   return Object.keys(entityComponentData.clientComponentData).map(Number);
}

const getEntityComponentArrays = (entityComponentData: EntityComponentData): ReadonlyArray<ComponentArray> => {
   // @Garbage
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData);
   const clientComponentTypes = getEntityClientComponentTypes(entityComponentData);

   const componentArrays = new Array<ComponentArray>();
   for (const serverComponentType of serverComponentTypes) {
      componentArrays.push(getServerComponentArray(serverComponentType));
   }
   for (const clientComponentType of clientComponentTypes) {
      componentArrays.push(getClientComponentArray(clientComponentType));
   }
   return componentArrays;
}

const getMaxNumRenderParts = (entityComponentData: EntityComponentData): number => {
   let maxNumRenderParts = 0;

   // @Garbage
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData);
   for (const componentType of serverComponentTypes) {
      const componentArray = getServerComponentArray(componentType);
      maxNumRenderParts += componentArray.getMaxRenderParts(entityComponentData);
   }

   // @Garbage
   const clientComponentTypes = getEntityClientComponentTypes(entityComponentData);
   for (const componentType of clientComponentTypes) {
      const componentArray = getClientComponentArray(componentType);
      maxNumRenderParts += componentArray.getMaxRenderParts(entityComponentData);
   }

   return maxNumRenderParts;
}

// @Cleanup: remove the need to pass in Entity
/** Creates and populates all the things which make up an entity and returns them. It is then up to the caller as for what to do with these things */
export function createEntityCreationInfo(entity: Entity, entityComponentData: EntityComponentData): EntityCreationInfo {
   const maxNumRenderParts = getMaxNumRenderParts(entityComponentData);
   const renderLayer = getEntityRenderLayer(entityComponentData.entityType, entityComponentData);
   const renderHeight = calculateRenderDepthFromLayer(renderLayer, entityComponentData);

   const renderInfo = new EntityRenderInfo(entity, renderLayer, renderHeight, maxNumRenderParts);

   const componentArrays = getEntityComponentArrays(entityComponentData);
   
   // Populate render info
   const componentIntermediateInfoRecord: Partial<Record<number, object>> = {};
   for (const componentArray of componentArrays) {
      if (typeof componentArray.populateIntermediateInfo !== "undefined") {
         const componentIntermediateInfo = componentArray.populateIntermediateInfo(renderInfo, entityComponentData);
         componentIntermediateInfoRecord[componentArray.id] = componentIntermediateInfo;
      }
   }

   registerDirtyRenderInfo(renderInfo);

   return {
      entity: entity,
      entityComponentData: entityComponentData,
      componentIntermediateInfoRecord: componentIntermediateInfoRecord,
      renderInfo: renderInfo
   };
}

export function addEntityToWorld(spawnTicks: number, layer: Layer, creationInfo: EntityCreationInfo): void {
   const entity = creationInfo.entity;
   
   const componentArrays = getEntityComponentArrays(creationInfo.entityComponentData);

   for (const componentArray of componentArrays) {
      const componentIntermediateInfo = creationInfo.componentIntermediateInfoRecord[componentArray.id]!;
      const component = componentArray.createComponent(creationInfo.entityComponentData, componentIntermediateInfo, creationInfo.renderInfo);
      
      componentArray.addComponent(entity, component, creationInfo.entityComponentData.entityType);
   }

   // @Speed @Garbage
   const serverComponentTypes = getEntityServerComponentTypes(creationInfo.entityComponentData);

   registerBasicEntityInfo(entity, creationInfo.entityComponentData.entityType, spawnTicks, layer, creationInfo.renderInfo, serverComponentTypes);
      
   // @Incomplete: is this really the right place to do this? is onLoad even what i want?
   // Call onLoad functions
   {
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (typeof componentArray.onLoad !== "undefined" && componentArray.hasComponent(entity)) {
            componentArray.onLoad(entity);
         }
      }
   }

   const renderInfo = creationInfo.renderInfo;
   layer.addEntityToRendering(entity, renderInfo.renderLayer, renderInfo.renderHeight);
   
   // If the entity has first spawned in, call any spawn functions
   const ageTicks = getEntityAgeTicks(entity);
   if (ageTicks === 0) {
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (componentArray.hasComponent(entity) && typeof componentArray.onSpawn !== "undefined") {
            componentArray.onSpawn(entity);
         }
      }
   }
}

export function removeEntity(entity: Entity, isDeath: boolean): void {
   const renderInfo = getEntityRenderInfo(entity);
   
   const layer = getEntityLayer(entity);
   layer.removeEntityFromRendering(entity, renderInfo.renderLayer);

   if (isDeath) {
      // Call onDie functions
      // @Speed
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (typeof componentArray.onDie !== "undefined" && componentArray.hasComponent(entity)) {
            componentArray.onDie(entity);
         } 
      }
   }
   
   removeEntitySounds(entity);

   undirtyRenderInfo(renderInfo);
   
   // @Incomplete: commenting this out because removed entities should have their lights automatically
   // removed by the light data update immediately after the entity data update, but i'm wondering if there
   // are any cases where entities are removed not in the entity data update?? or could be in the future? cuz this is exported everywhence
   // removeAllAttachedLights(renderInfo);

   const componentArrays = getComponentArrays();

   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (typeof componentArray.onRemove !== "undefined" && componentArray.hasComponent(entity)) {
         componentArray.onRemove(entity);
      }
   }

   // Remove from component arrays
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (componentArray.hasComponent(entity)) {
         componentArray.removeComponent(entity);
      }
   }

   delete entityTypes[entity];
   delete entitySpawnTicks[entity];
   delete entityLayers[entity];
   delete entityRenderInfos[entity];
}

export function changeEntityLayer(entity: Entity, newLayer: Layer): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const previousLayer = getEntityLayer(entity);

   const renderInfo = getEntityRenderInfo(entity);

   previousLayer.removeEntityFromRendering(entity, renderInfo.renderLayer);
   newLayer.addEntityToRendering(entity, renderInfo.renderLayer, renderInfo.renderHeight);

   // Remove from all previous chunks
   for (const chunk of transformComponent.chunks) {
      chunk.removeEntity(entity);
      transformComponent.chunks.delete(chunk);
   }

   // Add to new ones
   // @Cleanup: this logic should be in transformcomponent, perhaps there is a function which already does this...
   const minChunkX = Math.max(Math.floor(transformComponent.boundingAreaMinX / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor(transformComponent.boundingAreaMaxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = Math.max(Math.floor(transformComponent.boundingAreaMinY / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor(transformComponent.boundingAreaMaxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const newChunk = newLayer.getChunk(chunkX, chunkY);
         newChunk.addEntity(entity);
         transformComponent.chunks.add(newChunk);
      }
   }

   entityLayers[entity] = newLayer;
}