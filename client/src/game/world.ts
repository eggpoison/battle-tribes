import { Settings, Entity, EntityType, assert } from "webgl-test-shared";
import { EntityRenderObject } from "./EntityRenderObject";
import Layer from "./Layer";
import { cleanEntityRenderParts, entityDataUsesClientInterp, undirtyRenderObject } from "./rendering/render-part-matrices";
import { calculateRenderDepthFromLayer, getEntityRenderLayer } from "./render-layers";
import { removeEntitySounds } from "./sound";
import { currentSnapshot } from "./game";
import { ENTITY_INTERMEDIATE_INFOS, EntityClientComponentData, EntityServerComponentData, getEntityComponentArrays, hasIntermediateInfo } from "./entity-component-types";
import { deleteEntityRenderData } from "./rendering/webgl/entity-rendering";

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
   readonly entityComponentData: EntityComponentData;
   readonly renderObject: EntityRenderObject;
}

export const layers: Array<Layer> = [];
let currentLayer: Layer;
export let surfaceLayer: Layer;
export let undergroundLayer: Layer;

const entityTypeMap: Partial<Record<Entity, EntityType>> = {};
const entitySpawnTicksMap: Partial<Record<Entity, number>> = {};
const entityLayerMap: Partial<Record<Entity, Layer>> = {};
const entityRenderObjectMap: Partial<Record<Entity, EntityRenderObject>> = {};

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
   const spawnTicks = entitySpawnTicksMap[entity];
   assert(spawnTicks !== undefined);
   return currentSnapshot.tick - spawnTicks;
}

export function getEntityLayer(entity: Entity): Layer {
   const layer = entityLayerMap[entity];
   assert(layer !== undefined);
   return layer;
}

export function getEntityType(entity: Entity): EntityType {
   const entityType = entityTypeMap[entity];
   assert(entityType !== undefined);
   return entityType;
}

export function getEntityRenderObject(entity: Entity): EntityRenderObject {
   const renderObject = entityRenderObjectMap[entity];
   assert(renderObject !== undefined);
   return renderObject;
}

export function entityExists(entity: Entity): boolean {
   return entityLayerMap[entity] !== undefined;
}

export function setEntityLayer(entity: Entity, layer: Layer): void {
   entityLayerMap[entity] = layer;
}

// @Cleanup: remove the need to pass in Entity
// @cleanup: SHOULDN'T HAVE SIDE EFFECTS!!
/** Creates and populates all the things which make up an entity and returns them. It is then up to the caller as for what to do with these things */
export function createEntityCreationInfo(entity: Entity, entityComponentData: EntityComponentData): EntityCreationInfo {
   const entityType = entityComponentData.entityType;
   
   let maxNumRenderParts = 0;

   const componentArrays = getEntityComponentArrays(entityType);
   for (let i = 0, len = componentArrays.length; i < len; i++) {
      const componentArray = componentArrays[i];
      maxNumRenderParts += componentArray.getMaxRenderParts(entityComponentData);
   }

   const renderLayer = getEntityRenderLayer(entityType, entityComponentData);
   const renderHeight = calculateRenderDepthFromLayer(renderLayer, entityComponentData);

   const isClientInterp = entityDataUsesClientInterp(entityComponentData.serverComponentData);
   const renderObject = new EntityRenderObject(entity, renderLayer, renderHeight, maxNumRenderParts, isClientInterp);

   // Populate render object
   if (hasIntermediateInfo(entityType)) { // @Hacky optimization for grass pretty much
      const intermediateInfos = ENTITY_INTERMEDIATE_INFOS[entityType];
      for (let i = 0, len = componentArrays.length; i < len; i++) {
         const componentArray = componentArrays[i];
         if (componentArray.populateIntermediateInfo !== undefined) {
            // @Garbage
            intermediateInfos[i] = componentArray.populateIntermediateInfo(renderObject, entityComponentData);
         }
      }
   }

   return {
      entity,
      entityComponentData,
      renderObject
   };
}

// @Hack: this "addToRendering" thing seems a bit hacky
export function addEntityToWorld(spawnTicks: number, layer: Layer, creationInfo: EntityCreationInfo, addToRendering: boolean): void {
   const entity = creationInfo.entity;
   const entityType = creationInfo.entityComponentData.entityType;
   
   const componentArrays = getEntityComponentArrays(entityType);
   const intermediateInfos = ENTITY_INTERMEDIATE_INFOS[entityType];
   
   // @Speed: Adding the components could be batched?? Could then also make like a batched addComponent function!!
   for (let i = 0, len = componentArrays.length; i < len; i++) {
      const componentArray = componentArrays[i];
      const componentIntermediateInfo = intermediateInfos[i];
      const component = componentArray.createComponent(creationInfo.entityComponentData, componentIntermediateInfo, creationInfo.renderObject);
      componentArray.addComponent(entity, component);
   }

   entityTypeMap[entity] = entityType;
   entitySpawnTicksMap[entity] = spawnTicks;
   entityLayerMap[entity] = layer;
   entityRenderObjectMap[entity] = creationInfo.renderObject;
      
   // @Incomplete: is this really the right place to do this? is onLoad even what i want?
   // Call onLoad functions
   for (let i = 0, len = componentArrays.length; i < len; i++) {
      const componentArray = componentArrays[i];
      if (componentArray.onLoad !== undefined) {
         componentArray.onLoad(entity);
      }
   }

   if (addToRendering) {
      const renderObject = creationInfo.renderObject;
      // Immediately fill the correct render object, because that is required for adding chunk-rendered entities to the world in addEntityToWorld
      // @HACK: interp!
      cleanEntityRenderParts(renderObject, 0, 0);
      layer.addEntityToRendering(entity, renderObject.renderLayer, renderObject.renderHeight);
   }
   
   // @Speed: awful to do it here for something that will happen exceedingly rarely in comparison to the normal case
   //         All onSpawn functions either play a sound or create particles - the play a sound logic will go away when the server sends sounds, so that just leaves the particle ones...
   // If the entity has first spawned in, call any spawn functions
   const ageTicks = getEntityAgeTicks(entity);
   // e.g. if packets are sent half as often as teh tick rate, then ageTicks <= 1 means it has spawned in.
   if (ageTicks <= Math.ceil(Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE) - 1) {
      for (let i = 0, len = componentArrays.length; i < len; i++) {
         const componentArray = componentArrays[i];
         if (componentArray.onSpawn !== undefined) {
            componentArray.onSpawn(entity);
         }
      }
   }
}

export function removeEntity(entity: Entity, isDeath: boolean): void {
   const renderObject = getEntityRenderObject(entity);
   
   const layer = getEntityLayer(entity);
   layer.removeEntityFromRendering(entity, renderObject.renderLayer);

   const entityType = getEntityType(entity);
   const componentArrays = getEntityComponentArrays(entityType);

   // @Speed: This won't be the case for the VAST majority of entities removed (usually.)
   if (isDeath) {
      // Call onDie functions
      for (let i = 0, len = componentArrays.length; i < len; i++) {
         const componentArray = componentArrays[i];
         if (componentArray.onDie !== undefined) {
            componentArray.onDie(entity);
         }
      }
   }
   
   // @Speed: grass will really have near zero sounds...
   removeEntitySounds(entity);

   if (renderObject.renderPartsAreDirty) {
      undirtyRenderObject(entity, renderObject);
   }
   deleteEntityRenderData(renderObject);
   
   // @Incomplete: commenting this out because removed entities should have their lights automatically
   //    removed by the light data update immediately after the entity data update, but i'm wondering if there
   //    are any cases where entities are removed not in the entity data update?? or could be in the future? cuz this is exported everywhence
   // removeAllAttachedLights(renderObject);

   // @Speed: could be batched across component arrays?? That would also make the if statement check far better.
   for (let i = 0, len = componentArrays.length; i < len; i++) {
      const componentArray = componentArrays[i];
      componentArray.addComponentToRemoveBuffer(entity);

      if (componentArray.onRemove !== undefined) {
         componentArray.onRemove(entity);
      }
   }

   delete entityTypeMap[entity];
   delete entitySpawnTicksMap[entity];
   delete entityLayerMap[entity];
   delete entityRenderObjectMap[entity];
}