import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import Layer from "./Layer";
import { removeEntityFromCensus, runTileCensuses } from "./census";
import { ComponentArray, ComponentArrays, getComponentArrayRecord } from "./components/ComponentArray";
import { registerEntityDestruction } from "./server/player-clients";
import Tribe from "./Tribe";
import { ServerComponentType } from "battletribes-shared/components";
import { assert } from "../../shared/src/utils";
import { addLayerBuildingBlockingTiles, layers, surfaceLayer, undergroundLayer } from "./layers";
import OPTIONS from "./options";
import { tileHasWallSubtile } from "./world-generation/terrain-generation-utils";
import { markWallTileInPathfinding } from "./pathfinding";
import { generateSurfaceTerrain } from "./world-generation/surface-layer-generation";
import { generateUndergroundTerrain } from "./world-generation/underground-layer-generation";
import { EntityConfig, entityConfigAttachInfoIsTethered } from "./components";
import { attachLightToHitbox } from "./lights";
import { attachEntityWithTether, attachHitboxRaw } from "./components/TransformComponent";
import { getEntityComponentTypes } from "./entity-component-types";
import { removeEntityFromSpawnDistributions, SPAWN_INFOS } from "./entity-spawn-info";

const enum Vars {
   START_TIME = 8
}

interface EntityJoinInfo {
   readonly entity: Entity;
   readonly entityConfig: EntityConfig;
   readonly layer: Layer;
   readonly entityComponentTypes: ReadonlyArray<ServerComponentType>;
   /** Number of ticks remaining until the entity will be added. */
   ticksRemaining: number;
}

let ticks = 0;
/** The time of day the server is currently in. Interval: [0, 24) */
let time = Vars.START_TIME;

const entityTypes: Partial<Record<Entity, EntityType>> = {};
const entityLayers: Partial<Record<Entity, Layer>> = {};
const entitySpawnTicks: Partial<Record<Entity, number>> = {};

const tribes = new Array<Tribe>();

// Array of join infos, sorted by the ticks remaining until they join.
const entityJoinBuffer = new Array<EntityJoinInfo>();
const entityRemoveBuffer = new Array<Entity>();

// We skip 0 as that is reserved as a no-entity marker
// We skip 1 also as that is reserved client-side for its ghost spectator entity.
// - @Cleanup: Would be nice if this didn't have to be the case, and we only had to reserve 0 and not 1.
let entityIDCounter: Entity = 2;

// @Cleanup: this should probs be in the layers file
export function generateLayers(): void {
   generateSurfaceTerrain(surfaceLayer);
   generateUndergroundTerrain(surfaceLayer, undergroundLayer);

   runTileCensuses();

   // @Cleanup: make into function
   for (const layer of layers) {
      // @Incomplete: investigate whether generate walls mode actually does anything
      // This check isn't strictly necessary but it improves speed
      if (OPTIONS.generateWalls) {
         for (let tileY = 0; tileY < Settings.WORLD_SIZE_TILES; tileY++) {
            for (let tileX = 0; tileX < Settings.WORLD_SIZE_TILES; tileX++) {
               if (tileHasWallSubtile(layer.wallSubtileTypes, tileX, tileY)) {
                  // Mark which chunks have wall tiles
                  const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
                  const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
                  const chunk = layer.getChunk(chunkX, chunkY);
                  chunk.hasWallTiles = true;
                  
                  // @Incomplete: This system is outdated! Should account for wall subtiles
                  // Mark inaccessible pathfinding nodes
                  markWallTileInPathfinding(layer, tileX, tileY);
               }
            }
         }
      }

      addLayerBuildingBlockingTiles(layer);
   }
}

export function getGameTicks(): number {
   return ticks;
}

export function getGameTime(): number {
   return time;
}

/* ----------- */
/* TRIBE STUFF */
/* ----------- */

export function addTribe(tribe: Tribe): void {
   tribes.push(tribe);
}

export function removeTribe(tribe: Tribe): void {
   const idx = tribes.indexOf(tribe);
   if (idx !== -1) {
      tribes.splice(idx, 1);
   }
}

export function getTribes(): ReadonlyArray<Tribe> {
   return tribes;
}

export function getTribe(tribeID: number): Tribe | null {
   for (let i = 0; i < tribes.length; i++) {``
      const tribe = tribes[i];
      if (tribe.id === tribeID) {
         return tribe;
      }
   }

   return null;
}

export function isNight(): boolean {
   return time < 6 || time >= 18;
}

export function tickGameTime(): void {
   ticks++;
   // @SQUEAM
   // time += Settings.TIME_PASS_RATE * Settings.DT_S / 3600;
   if (time >= 24) {
      time -= 24;
   }
}

export function ticksToGameHours(ticks: number): number {
   return ticks * (Settings.TIME_PASS_RATE * Settings.DT_S / 3600);
}

export function getEntityType(entity: Entity): EntityType {
   const entityType = entityTypes[entity];
   assert(typeof entityType !== "undefined");
   return entityType;
}

/** Cleanup: obscure, only used in 1 situation. Rework so we can remove this */
export function validateEntity(entity: Entity): Entity | 0 {
   return typeof entityTypes[entity] !== "undefined" ? entity : 0;
}

export function entityExists(entity: Entity): boolean {
   return typeof entityTypes[entity] !== "undefined";
}

export function getEntityLayer(entity: Entity): Layer {
   const layer = entityLayers[entity];
   if (typeof layer === "undefined") {
      throw new Error("Entity doesn't exist!");
   }
   return layer;
}

export function getEntityAgeTicks(entity: Entity): number {
   if (typeof entitySpawnTicks[entity] === "undefined") {
      throw new Error();
   }
   return ticks - entitySpawnTicks[entity]!;
}

export function getEntitySpawnTicks(entity: Entity): number {
   const spawnTicks = entitySpawnTicks[entity];
   if (typeof spawnTicks === "undefined") {
      throw new Error("Entity doesn't exist!");
   }
   return spawnTicks;
}

export function setEntityLayer(entity: Entity, layer: Layer): void {
   entityLayers[entity] = layer;
}

export function pushEntityJoinBuffer(shouldTickJoinInfos: boolean): void {
   // NOTE: The logic in here should be mirrored with the addEntityImmediate function. Changes should be made to both functions at once
   
   // Push entities
   let finalPushedIdx: number | undefined;
   for (let i = 0; i < entityJoinBuffer.length; i++) {
      const joinInfo = entityJoinBuffer[i];
      if (joinInfo.ticksRemaining === 0) {
         entityTypes[joinInfo.entity] = joinInfo.entityConfig.entityType;
         entityLayers[joinInfo.entity] = joinInfo.layer;
         entitySpawnTicks[joinInfo.entity] = ticks;

         // Add lights
         for (const lightCreationInfo of joinInfo.entityConfig.lights) {
            attachLightToHitbox(lightCreationInfo.light, lightCreationInfo.attachedHitbox, joinInfo.entity);
         }

         finalPushedIdx = i;
      } else if (shouldTickJoinInfos) {
         joinInfo.ticksRemaining--;
      }
   }
   
   const componentArrayFinalJoiningIndexes = {} as Record<ServerComponentType, number | null>;
   
   // Push components
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];
      componentArray.pushComponentsFromBuffer();

      const finalJoiningIdx = componentArray.getFinalJoiningBufferIdx();
      componentArrayFinalJoiningIndexes[componentArray.componentType] = finalJoiningIdx;
      
      if (shouldTickJoinInfos) {
         componentArray.tickJoinInfos(finalJoiningIdx);
      }
   }

   // Do this before the onJoin function so that child configs get registered to the parent transformComponetns in time for the onJoin functions
   if (typeof finalPushedIdx !== "undefined") {
      // Check if there are any entities which are immediately being carried or have children
      for (let i = 0; i <= finalPushedIdx; i++) {
         const joinInfo = entityJoinBuffer[i];

         const attachInfo = joinInfo.entityConfig.attachInfo;
         if (typeof attachInfo !== "undefined") {
            if (entityConfigAttachInfoIsTethered(attachInfo)) {
               attachEntityWithTether(joinInfo.entity, attachInfo.parentHitbox.entity, attachInfo.parentHitbox, attachInfo.idealDistance, attachInfo.springConstant, attachInfo.damping, attachInfo.isPartOfParent);
            } else {
               attachHitboxRaw(attachInfo.attachedHitbox, attachInfo.parentHitbox, attachInfo.isPartOfParent);
            }
         }

         const childConfigs = joinInfo.entityConfig.childConfigs;
         if (typeof childConfigs !== "undefined") {
            for (const childConfig of childConfigs) {
               // Find the join info for the child
               // @Speed !
               let childJoinInfo: EntityJoinInfo | undefined;
               for (let j = 0; j <= finalPushedIdx; j++) {
                  const currentJoinInfo = entityJoinBuffer[j];
                  if (currentJoinInfo.entityConfig === childConfig.entityConfig) {
                     childJoinInfo = currentJoinInfo
                     break;
                  }
               }
               assert(typeof childJoinInfo !== "undefined");
               
               attachHitboxRaw(childConfig.attachedHitbox, childConfig.parentHitbox, childConfig.isPartOfParent);
            }
         }
      }

      // Clear pushed entities from queue
      const numPushedEntities = finalPushedIdx + 1;
      entityJoinBuffer.splice(0, numPushedEntities);
   }

   // Once all new components are added, call on join functions and clear buffers
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      // NOTE: For this to work correctly, a component should never be inserted at
      // or before the final joining idx by an onJoin function.

      const finalJoiningIdx = componentArrayFinalJoiningIndexes[componentArray.componentType];
      
      const onJoin = componentArray.onJoin;
      if (typeof onJoin !== "undefined" && finalJoiningIdx !== null) {
         const componentBufferIDs = componentArray.getComponentBufferIDs();

         for (let j = 0; j <= finalJoiningIdx; j++) {
            const entityID = componentBufferIDs[j];
            onJoin(entityID);
         }
      }

      componentArray.clearJoinedComponents(finalJoiningIdx);
   }
}

// @Hack? joinDelayTicks is really only used for guardian gem smash attack
export function createEntity<ComponentTypes extends ServerComponentType>(entityConfig: EntityConfig, layer: Layer, joinDelayTicks: number): Entity {
   const entity = entityIDCounter++;
   
   const componentTypes = getEntityComponentTypes(entityConfig.entityType);

   // Make sure the entity has the right components
   // @INCOMPLETE: Unable to check if the actual components are right!! This check needs to be deeper - or enforced automatically in entity config creation.
   assert(entityConfig.components.length === componentTypes.length);
   
   const componentArrayRecord = getComponentArrayRecord();

   // Run initialise functions
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;

      if (typeof componentArray.onInitialise !== "undefined") {
         // @Cleanup: first 2 parameters can be combined
         componentArray.onInitialise(entityConfig, entity, layer);
      }
   }
   
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const component = entityConfig.components[i]!;

      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;
      componentArray.addComponentToBuffer(entity, component, joinDelayTicks);
   }

   addEntityToJoinBuffer(entity, entityConfig, layer, componentTypes, joinDelayTicks);

   // @Hack? Should the child configs just be handled on the entity config when adding it to the world?
   if (typeof entityConfig.childConfigs !== "undefined") {
      for (const childConfig of entityConfig.childConfigs) {
         createEntity(childConfig.entityConfig, layer, joinDelayTicks);
      }
   }

   if (typeof entityConfig.attachInfo !== "undefined") {
      if (typeof entityConfig.attachInfo.attachedHitbox === "undefined") {
         throw new Error();
      }
   }

   return entity;
}

/**
 * Creates the entity and immediately adds it to the board, forgoeing the entity join queue system.
 * THIS FUNCTION IS TO BE USED IN VERY SPECIFIC PLACES, NOT TO BE MEDDLED WITH!! DO NOT YOU THIKN ABOUT IT!! createEntity IS FINE N DANDY!!!!!!!!
 */
export function createEntityImmediate<ComponentTypes extends ServerComponentType>(entityConfig: EntityConfig, layer: Layer): Entity {
   // NOTE: The logic in here should be mirrored with the pushEntityJoinBuffer function. Changes should be made to both functions at once

   const entity = entityIDCounter++;

   const componentTypes = getEntityComponentTypes(entityConfig.entityType);
   const componentArrayRecord = getComponentArrayRecord();

   // Run initialise functions
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType];

      if (typeof componentArray.onInitialise !== "undefined") {
         // @Cleanup: first 2 parameters can be combined
         componentArray.onInitialise(entityConfig, entity, layer);
      }
   }

   entityTypes[entity] = entityConfig.entityType;
   entityLayers[entity] = layer;
   entitySpawnTicks[entity] = ticks;

   // Add lights
   for (const lightCreationInfo of entityConfig.lights) {
      attachLightToHitbox(lightCreationInfo.light, lightCreationInfo.attachedHitbox, entity);
   }

   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const component = entityConfig.components[i]!;

      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;
      componentArray.addComponent(entity, component);
   }

   const attachInfo = entityConfig.attachInfo;
   if (typeof attachInfo !== "undefined") {
      if (entityConfigAttachInfoIsTethered(attachInfo)) {
         attachEntityWithTether(entity, attachInfo.parentHitbox.entity, attachInfo.parentHitbox, attachInfo.idealDistance, attachInfo.springConstant, attachInfo.damping, attachInfo.isPartOfParent);
      } else {
         attachHitboxRaw(attachInfo.attachedHitbox, attachInfo.parentHitbox, attachInfo.isPartOfParent);
         console.log(attachInfo.parentHitbox.rootEntity);
      }
   }

   // @Hack? Should the child configs just be handled on the entity config when adding it to the world?
   const childConfigs = entityConfig.childConfigs;
   if (typeof childConfigs !== "undefined") {
      for (const childConfig of childConfigs) {
         createEntityImmediate(childConfig.entityConfig, layer);
         attachHitboxRaw(childConfig.attachedHitbox, childConfig.parentHitbox, childConfig.isPartOfParent);
      }
   }

   for (const componentType of componentTypes) {
      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;

      const onJoin = componentArray.onJoin;
      if (typeof onJoin !== "undefined") {
         onJoin(entity);
      }
   }

   return entity;
}

export function preDestroyFlaggedEntities(): void {
   for (const entity of entityRemoveBuffer) {
      registerEntityDestruction(entity);
   }
}

/** Removes game objects flagged for deletion */
export function destroyFlaggedEntities(): void {
   for (const entity of entityRemoveBuffer) {
      // @Speed: don't do per entity, do per component array
      // Call remove functions
      for (let i = 0; i < ComponentArrays.length; i++) {
         const componentArray = ComponentArrays[i];
         if (componentArray.hasComponent(entity) && typeof componentArray.onRemove !== "undefined") {
            componentArray.onRemove(entity);
         }
      }

      // @Speed: don't do per entity, do per component array
      // Remove components
      for (let i = 0; i < ComponentArrays.length; i++) {
         const componentArray = ComponentArrays[i];
         if (componentArray.hasComponent(entity)) {
            componentArray.removeComponent(entity);
         }
      }

      removeEntityFromCensus(entity);

      // @SPEED!
      for (const spawnInfo of SPAWN_INFOS) {
         const spawnDistribution = spawnInfo.spawnDistribution;
         if (spawnDistribution.entityDensityMap.has(entity)) {
            removeEntityFromSpawnDistributions(entity, spawnDistribution);
            break;
         }
      }

      delete entityTypes[entity];
      delete entityLayers[entity];
      delete entitySpawnTicks[entity];
   }

   entityRemoveBuffer.length = 0;
}

export function entityIsFlaggedForDestruction(entity: Entity): boolean {
   return entityRemoveBuffer.indexOf(entity) !== -1;
}

export function destroyEntity(entity: Entity): void {
   if (!entityExists(entity)) {
      throw new Error("Tried to destroy an entity which doesn't exist.");
   }
   if (entityIsFlaggedForDestruction(entity)) {
      return;
   }

   // Add the entity to the remove buffer
   entityRemoveBuffer.push(entity);

   // Remove the entity from the join buffer
   // @Speed ?
   for (let i = 0; i < entityJoinBuffer.length; i++) {
      const joinInfo = entityJoinBuffer[i];

      if (joinInfo.entity === entity) {
         entityJoinBuffer.splice(i, 1);
         break;
      }
   }

   // Call any preRemove functions
   const componentTypes = getEntityComponentTypes(getEntityType(entity));
   const componentArrayRecord = getComponentArrayRecord();
   for (const componentType of componentTypes) {
      const componentArray = componentArrayRecord[componentType];
      if (typeof componentArray.preRemove !== "undefined") {
         componentArray.preRemove(entity);
      }
   }
}

export function addEntityToJoinBuffer(entity: Entity, entityConfig: EntityConfig, layer: Layer, entityComponentTypes: ReadonlyArray<ServerComponentType>, joinDelayTicks: number): void {
   // Find a spot for the entity
   
   const joinInfo: EntityJoinInfo = {
      entity: entity,
      entityConfig: entityConfig,
      layer: layer,
      entityComponentTypes: entityComponentTypes,
      ticksRemaining: joinDelayTicks
   };

   // Find a spot for the entity
   let insertIdx = entityJoinBuffer.length;
   // @Speed: use binary sort if it matters
   for (let i = 0; i < entityJoinBuffer.length; i++) {
      if (entityJoinBuffer[i].ticksRemaining > joinDelayTicks) {
         insertIdx = i;
         break;
      }
   }
   entityJoinBuffer.splice(insertIdx, 0, joinInfo);
}

export function tickEntities(): void {
   const gameTicks = getGameTicks();
   for (const componentArray of ComponentArrays) {
      if (typeof componentArray.onTick !== "undefined" && gameTicks % componentArray.onTick.tickInterval === 0) {
         const func = componentArray.onTick.func;
         for (let i = 0; i < componentArray.activeEntities.length; i++) {
            const entity = componentArray.activeEntities[i];
            func(entity);
         }
      }

      componentArray.deactivateQueue();
   }
}

export function tickIntervalHasPassed(intervalSeconds: number): boolean {
   const ticksPerInterval = intervalSeconds * Settings.TICK_RATE;
   
   const gameTicks = getGameTicks();
   const previousCheck = (gameTicks - 1) / ticksPerInterval;
   const check = gameTicks / ticksPerInterval;
   return Math.floor(previousCheck) !== Math.floor(check);
}