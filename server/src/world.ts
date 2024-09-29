import { EntityID, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { tickTribes } from "./ai-tribe-building/ai-building";
import Layer from "./Layer";
import { removeEntityFromCensus } from "./census";
import { ComponentArrays } from "./components/ComponentArray";
import { onCowDeath } from "./entities/mobs/cow";
import { onFishDeath } from "./entities/mobs/fish";
import { onKrumblidDeath } from "./entities/mobs/krumblid";
import { onYetiDeath } from "./entities/mobs/yeti";
import { onSlimeSpitDeath } from "./entities/projectiles/slime-spit";
import { onCactusDeath } from "./entities/resources/cactus";
import { onTribeWarriorDeath } from "./entities/tribes/tribe-warrior";
import { onTribeWorkerDeath } from "./entities/tribes/tribe-worker";
import { getPlayerClientFromInstanceID, registerEntityRemoval } from "./server/player-clients";
import Tribe from "./Tribe";
import generateSurfaceTerrain, { TerrainGenerationInfo } from "./world-generation/surface-terrain-generation";
import { generateUndergroundTerrain } from "./world-generation/underground-terrain-generation";
import Chunk from "./Chunk";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { PlayerComponentArray } from "./components/PlayerComponent";

const enum Vars {
   START_TIME = 6
}

export const enum LayerType {
   surface,
   underground
}

interface EntityJoinInfo {
   readonly id: number;
   readonly entityType: EntityType;
   readonly layer: Layer;
}

export let surfaceLayer: Layer;
export let undergroundLayer: Layer;
export const layers = new Array<Layer>();

let ticks = 0;
/** The time of day the server is currently in. Interval: [0, 24) */
let time = Vars.START_TIME;

const entityTypes: Partial<Record<EntityID, EntityType>> = {};
const entityLayers: Partial<Record<EntityID, Layer>> = {};

const tribes = new Array<Tribe>();

const entityJoinBuffer = new Array<EntityJoinInfo>();
const entityRemoveBuffer = new Array<EntityID>();

export function createLayers(surfaceTerrainGenerationInfo: TerrainGenerationInfo, undergroundTerrainGenerationInfo: TerrainGenerationInfo): void {
   surfaceLayer = new Layer(surfaceTerrainGenerationInfo);
   layers.push(surfaceLayer);
   undergroundLayer = new Layer(undergroundTerrainGenerationInfo);
   layers.push(undergroundLayer);
}

export function getLayerByType(type: LayerType): Layer {
   return type === LayerType.surface ? surfaceLayer : undergroundLayer;
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

export function updateTribes(): void {
   // @Cleanup: why do we have two different ones??
   
   for (const tribe of tribes) {
      tribe.tick();
   }
   // @Cleanup: Maybe move to server tick function
   tickTribes();
}

export function getTribes(): ReadonlyArray<Tribe> {
   return tribes;
}

export function getTribe(tribeID: number): Tribe {
   for (let i = 0; i < tribes.length; i++) {
      const tribe = tribes[i];
      if (tribe.id === tribeID) {
         return tribe;
      }
   }

   throw new Error("Couldn't find a tribe with ID " + tribeID);
}

export function isNight(): boolean {
   return time < 6 || time >= 18;
}

export function tickGameTime(): void {
   ticks++;
   time += Settings.TIME_PASS_RATE / Settings.TPS / 3600;
   if (time >= 24) {
      time -= 24;
   }
}

export function getEntityType(entity: EntityID): EntityType | undefined {
   return entityTypes[entity];
}

/** Cleanup: obscure, only used in 1 situation. Rework so we can remove this */
export function validateEntity(entity: EntityID): EntityID | 0 {
   return typeof entityTypes[entity] !== "undefined" ? entity : 0;
}

export function entityExists(entity: EntityID): boolean {
   return typeof entityTypes[entity] !== "undefined";
}

export function getEntityLayer(entity: EntityID): Layer {
   const layer = entityLayers[entity];
   if (typeof layer === "undefined") {
      throw new Error();
   }
   return layer;
}

export function pushJoinBuffer(): void {
   // Push components
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];
      componentArray.pushComponentsFromBuffer();
   }

   // Push entities
   for (const joinInfo of entityJoinBuffer) {
      entityTypes[joinInfo.id] = joinInfo.entityType;
      entityLayers[joinInfo.id] = joinInfo.layer;
   }

   // Call on join functions and clear buffers
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      const onJoin = componentArray.onJoin;
      if (typeof onJoin !== "undefined") {
         const componentBufferIDs = componentArray.getComponentBufferIDs();

         for (let j = 0; j < componentBufferIDs.length; j++) {
            const entityID = componentBufferIDs[j];
            onJoin(entityID);
         }
      }

      componentArray.clearBuffer();
   }

   entityJoinBuffer.length = 0;
}

/** Removes game objects flagged for deletion */
export function destroyFlaggedEntities(): void {
   for (const entity of entityRemoveBuffer) {
      registerEntityRemoval(entity);

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
      delete entityTypes[entity];
   }

   entityRemoveBuffer.length = 0;
}

export function entityIsFlaggedForDestruction(entity: EntityID): boolean {
   return entityRemoveBuffer.indexOf(entity) !== -1;
}

export function destroyEntity(entity: EntityID): void {
   // @Temporary
   const entityType = getEntityType(entity);
   if (typeof entityType === "undefined") {
      throw new Error("Tried to remove an entity before it was added to the board.");
   }
   
   // Don't try to remove if already being/is removed
   if (entityIsFlaggedForDestruction(entity) || !entityExists(entity)) {
      return;
   }

   // Add the entity to the remove buffer
   entityRemoveBuffer.push(entity);
   // Remove the entity from the join buffer
   for (let i = 0; i < entityJoinBuffer.length; i++) {
      const joinInfo = entityJoinBuffer[i];

      if (joinInfo.id === entity) {
         entityJoinBuffer.splice(i, 1);
         break;
      }
   }

   // @Cleanup: do these functions actually need to be called here? why not in the proper remove flagged function?
   switch (entityType) {
      case EntityType.cow: onCowDeath(entity); break;
      // @Temporary
      // case EntityType.tree: onTreeDeath(entity); break;
      case EntityType.krumblid: onKrumblidDeath(entity); break;
      case EntityType.cactus: onCactusDeath(entity); break;
      case EntityType.tribeWorker: onTribeWorkerDeath(entity); break;
      case EntityType.tribeWarrior: onTribeWarriorDeath(entity); break;
      case EntityType.yeti: onYetiDeath(entity); break;
      case EntityType.fish: onFishDeath(entity); break;
      case EntityType.slimeSpit: onSlimeSpitDeath(entity); break;
   }
}

export function addEntityToJoinBuffer(entity: EntityID, entityType: EntityType, layer: Layer): void {
   entityJoinBuffer.push({
      id: entity,
      entityType: entityType,
      layer: layer
   });
}

export function updateEntities(): void {
   const gameTicks = getGameTicks();
   for (const componentArray of ComponentArrays) {
      if (typeof componentArray.onTick !== "undefined" && gameTicks % componentArray.onTick.tickInterval === 0) {
         const func = componentArray.onTick.func;
         for (let i = 0; i < componentArray.activeComponents.length; i++) {
            const entity = componentArray.activeEntities[i];
            const component = componentArray.activeComponents[i];
            func(component, entity);
         }
      }

      componentArray.deactivateQueue();
   }
}

export function changeEntityLayer(entity: EntityID, newLayer: Layer): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const previousLayer = getEntityLayer(entity);

   // Remove from all previous chunks and add to new ones
   const newChunks = new Array<Chunk>();
   const minChunkX = Math.max(Math.floor(transformComponent.boundingAreaMinX / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor(transformComponent.boundingAreaMaxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor(transformComponent.boundingAreaMinY / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor(transformComponent.boundingAreaMaxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = previousLayer.getChunk(chunkX, chunkY);
         const idx = transformComponent.chunks.indexOf(chunk);
         if (idx !== -1) {
            transformComponent.removeFromChunk(entity, chunk);
            transformComponent.chunks.splice(idx, 1);

            const newChunk = newLayer.getChunk(chunkX, chunkY);
            transformComponent.addToChunk(entity, newChunk)
            newChunks.push(newChunk);
         }
      }
   }
   transformComponent.chunks = newChunks;

   entityLayers[entity] = newLayer;
}