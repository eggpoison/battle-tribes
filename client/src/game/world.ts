import { Settings, Entity, EntityType, assert } from "webgl-test-shared";
import { EntityRenderInfo } from "./EntityRenderInfo";
import { ComponentArray, getComponentArrays } from "./entity-components/ComponentArray";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import Layer from "./Layer";
import { cleanEntityRenderParts, undirtyRenderInfo } from "./rendering/render-part-matrices";
import { calculateRenderDepthFromLayer, getEntityRenderLayer } from "./render-layers";
import { removeEntitySounds } from "./sound";
import { currentSnapshot } from "./game";
import { EntityClientComponentData, EntityServerComponentData } from "./networking/packet-snapshots";
import { getServerComponentArray } from "./entity-components/ServerComponentArray";
import { getClientComponentArray } from "./entity-components/ClientComponentArray";

export const layers = new Array<Layer>();

export let surfaceLayer: Layer;
export let undergroundLayer: Layer;
let currentLayer: Layer;

const entityTypes: Partial<Record<Entity, EntityType>> = {};
const entitySpawnTicks: Partial<Record<Entity, number>> = {};
const entityLayers: Partial<Record<Entity, Layer>> = {};
const entityRenderInfos: Partial<Record<Entity, EntityRenderInfo>> = {};
const entityComponentArrays: Partial<Record<Entity, ReadonlyArray<ComponentArray>>> = {};

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
   const spawnTicks = entitySpawnTicks[entity];
   if (typeof spawnTicks === "undefined") {
      throw new Error("Entity " + entity + " doesn't exist");
   }
   return currentSnapshot.tick - spawnTicks;
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
   assert(entityRenderInfos[entity]);
   return entityRenderInfos[entity];
}

export function getEntityComponentArrays(entity: Entity): ReadonlyArray<ComponentArray> {
   assert(entityComponentArrays[entity]);
   return entityComponentArrays[entity];
}

export function entityExists(entity: Entity): boolean {
   return typeof entityLayers[entity] !== "undefined";
}

function registerBasicEntityInfo(entity: Entity, entityType: EntityType, spawnTicks: number, layer: Layer, renderInfo: EntityRenderInfo, componentArrays: ReadonlyArray<ComponentArray>): void {
   entityTypes[entity] = entityType;
   entitySpawnTicks[entity] = spawnTicks;
   entityLayers[entity] = layer;
   entityRenderInfos[entity] = renderInfo;
   entityComponentArrays[entity] = componentArrays;
}

// @Cleanup: location
/** Basically just all the component data used to create an entity. */
export interface EntityComponentData {
   readonly entityType: EntityType;
   readonly serverComponentData: EntityServerComponentData;
   readonly clientComponentData: EntityClientComponentData;
}

// @Location
/** Entity creation info, populated with all the data which comprises a full entity. */
export interface EntityCreationInfo {
   readonly entity: Entity;
   readonly componentArrays: ReadonlyArray<ComponentArray>;
   readonly entityComponentData: EntityComponentData;
   componentIntermediateInfoRecord: Partial<Record<number, object>>;
   readonly renderInfo: EntityRenderInfo;
}

// @Cleanup: remove the need to pass in Entity
// @cleanup: SHOULDN'T HAVE SIDE EFFECTS!!
/** Creates and populates all the things which make up an entity and returns them. It is then up to the caller as for what to do with these things */
export function createEntityCreationInfo(entity: Entity, entityComponentData: EntityComponentData): EntityCreationInfo {
   let maxNumRenderParts = 0;
   const componentArrays = new Array<ComponentArray>();

   for (const componentType of entityComponentData.serverComponentData.keys()) {
      const componentArray = getServerComponentArray(componentType);
      componentArrays.push(componentArray);
      maxNumRenderParts += componentArray.getMaxRenderParts(entityComponentData);
   }

   for (const componentType of entityComponentData.clientComponentData.keys()) {
      const componentArray = getClientComponentArray(componentType);
      componentArrays.push(componentArray);
      maxNumRenderParts += componentArray.getMaxRenderParts(entityComponentData);
   }
   
   const renderLayer = getEntityRenderLayer(entityComponentData.entityType, entityComponentData);
   const renderHeight = calculateRenderDepthFromLayer(renderLayer, entityComponentData);

   const renderInfo = new EntityRenderInfo(entity, renderLayer, renderHeight, maxNumRenderParts);

   // Populate render info
   const componentIntermediateInfoRecord: Partial<Record<number, object>> = {};
   for (const componentArray of componentArrays) {
      if (typeof componentArray.populateIntermediateInfo !== "undefined") {
         const componentIntermediateInfo = componentArray.populateIntermediateInfo(renderInfo, entityComponentData);
         componentIntermediateInfoRecord[componentArray.id] = componentIntermediateInfo;
      }
   }

   // Immediately fill the correct render info, because that is required for adding chunk-rendered entities to the world in addEntityToWorld
   // @HACK: tickInterp!
   cleanEntityRenderParts(renderInfo, 0);

   return {
      entity: entity,
      componentArrays: componentArrays,
      entityComponentData: entityComponentData,
      componentIntermediateInfoRecord: componentIntermediateInfoRecord,
      renderInfo: renderInfo
   };
}

// @Hack: this "addToRendering" thing seems a bit hacky
export function addEntityToWorld(spawnTicks: number, layer: Layer, creationInfo: EntityCreationInfo, addToRendering: boolean): void {
   const entity = creationInfo.entity;
   const componentArrays = creationInfo.componentArrays;
   
   for (const componentArray of componentArrays) {
      const componentIntermediateInfo = creationInfo.componentIntermediateInfoRecord[componentArray.id];
      // @Hack: the cast
      const component = componentArray.createComponent(creationInfo.entityComponentData, componentIntermediateInfo as unknown as object, creationInfo.renderInfo);
      
      componentArray.addComponent(entity, component, creationInfo.entityComponentData.entityType);
   }

   registerBasicEntityInfo(entity, creationInfo.entityComponentData.entityType, spawnTicks, layer, creationInfo.renderInfo, componentArrays);
      
   // @Incomplete: is this really the right place to do this? is onLoad even what i want?
   // Call onLoad functions
   for (const componentArray of componentArrays) {
      if (typeof componentArray.onLoad !== "undefined" && componentArray.hasComponent(entity)) {
         componentArray.onLoad(entity);
      }
   }

   if (addToRendering) {
      const renderInfo = creationInfo.renderInfo;
      layer.addEntityToRendering(entity, renderInfo.renderLayer, renderInfo.renderHeight);
   }
   
   // If the entity has first spawned in, call any spawn functions
   const ageTicks = getEntityAgeTicks(entity);
   // e.g. if packets are sent half as often as teh tick rate, then ageTicks <= 1 means it has spawned in.
   if (ageTicks <= Math.ceil(Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE) - 1) {
      const componentArrays = getComponentArrays();
      for (const componentArray of componentArrays) {
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
      for (const componentArray of componentArrays) {
         if (typeof componentArray.onDie !== "undefined" && componentArray.hasComponent(entity)) {
            componentArray.onDie(entity);
         } 
      }
   }
   
   removeEntitySounds(entity);

   undirtyRenderInfo(renderInfo);
   
   // @Incomplete: commenting this out because removed entities should have their lights automatically
   //    removed by the light data update immediately after the entity data update, but i'm wondering if there
   //    are any cases where entities are removed not in the entity data update?? or could be in the future? cuz this is exported everywhence
   // removeAllAttachedLights(renderInfo);

   const componentArrays = getEntityComponentArrays(entity);
   for (const componentArray of componentArrays) {
      if (typeof componentArray.onRemove !== "undefined") {
         componentArray.onRemove(entity);
      }
      componentArray.removeComponent(entity);
   }

   delete entityTypes[entity];
   delete entitySpawnTicks[entity];
   delete entityLayers[entity];
   delete entityRenderInfos[entity];
   delete entityComponentArrays[entity];
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