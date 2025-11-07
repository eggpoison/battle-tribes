import { EntityTickEventType, TribesmanTitle, SubtileType, TileType, STRUCTURE_TYPES, HitFlags, AttackEffectiveness, assert, Point, randAngle, randFloat, PacketReader, Entity, EntityType, ServerComponentType } from "webgl-test-shared";
import { setCameraSubject } from "../camera";
import { getComponentArrays, getServerComponentArray } from "../entity-components/ComponentArray";
import { setCurrentSnapshot } from "../client";
import Layer from "../Layer";
import { playerInstance, setPlayerInstance } from "../player";
import { playHeadSound, playSound } from "../sound";
import { ExtendedTribe, readExtendedTribeData, readShortTribeData, Tribe, tribes, updatePlayerTribe } from "../tribes";
import { addEntityToWorld, changeEntityLayer, createEntityCreationInfo, EntityComponentData, entityExists, getCurrentLayer, getEntityComponentTypes, getEntityLayer, getEntityRenderInfo, getEntityType, layers, removeEntity, setCurrentLayer } from "../world";
import { ClientComponentData, getEntityClientComponentConfigs } from "../entity-components/client-components";
import { ServerComponentData } from "../entity-components/components";
import { ClientComponentType } from "../entity-components/client-component-types";
import { registerDirtyRenderInfo } from "../rendering/render-part-matrices";
import { LightData, readLightsFromData, updateLightsFromData } from "../lights";
import { getRandomPositionInEntity, TransformComponentArray, TransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createHealingParticle, createSlimePoolParticle, createSparkParticle } from "../particles";
import { addHitboxVelocity, getHitboxByLocalID, getHitboxVelocity, Hitbox, setHitboxVelocity } from "../hitboxes";
import { createDamageNumber, createHealNumber, createResearchNumber } from "../text-canvas";
import { processTickEvent } from "../entity-tick-events";
import { setMinedSubtiles, tickCollapse } from "../collapses";
import { GrassBlockerData, readGrassBlockers, updateGrassBlockersFromData } from "../grass-blockers";
import Board from "../Board";
import { tribesTabState } from "../../ui-state/tribes-tab-state.svelte";
import { infocardsState } from "../../ui-state/infocards-state.svelte";
import { updateRenderChunkFromTileUpdate } from "../rendering/render-chunks";

// @Speed @Memory I cause a lot of GC right now by reading things in the snapshot decoding process which aren't necessary for snapshots (e.g. data for all tribes), instead of reading that when updating the game state to that.

export type EntityServerComponentData = Partial<{
   [T in ServerComponentType]: ServerComponentData<T>;
}>;
export type EntityClientComponentData = Partial<{
   [T in ClientComponentType]: ClientComponentData<T>;
}>;

export interface EntitySnapshot {
   readonly entityType: EntityType;
   readonly spawnTicks: number;
   readonly layer: Layer;
   readonly serverComponentData: EntityServerComponentData;
   readonly clientComponentData: EntityClientComponentData;
}

interface RemovedEntityInfo {
   readonly entity: Entity;
   readonly isDestroyed: boolean;
}

interface EntityHitData {
   readonly entity: Entity;
   readonly hitboxLocalID: number;
   readonly position: Point;
   readonly attackEffectiveness: AttackEffectiveness;
   readonly damage: number;
   readonly shouldShowDamageNumber: boolean;
   readonly flags: number;
}

interface PlayerKnockbackData {
   readonly knockback: number;
   readonly knockbackDirection: number;
}

interface EntityHealData {
   readonly position: Point;
   readonly healedEntity: Entity;
   readonly healerEntity: Entity;
   readonly healAmount: number;
}

interface ResearchOrbCompleteData {
   readonly position: Point;
   readonly amount: number;
}

interface TileUpdateData {
   readonly layer: Layer;
   readonly tileIndex: number;
   readonly tileType: TileType;
}

interface WallSubtileUpdateData {
   readonly subtileIndex: number;
   readonly subtileType: SubtileType;
   readonly damageTaken: number;
}

interface EntityTickEventData {
   readonly entity: Entity;
   readonly type: EntityTickEventType;
   readonly data: number;
}

interface MinedSubtileData {
   readonly subtileIndex: number;
   readonly subtileType: SubtileType;
   readonly support: number;
   readonly isCollapsing: boolean;
}

interface CollapseData {
   readonly collapsingSubtileIndex: number;
   readonly ageTicks: number;
}

/** A snapshot of the game represented by a game tick packet. */
export interface PacketSnapshot {
   readonly tick: number;
   readonly time: number;
   readonly layer: Layer;
   readonly entities: Map<Entity, EntitySnapshot>;
   /** Entities which have at least one thing which needs to be visually interpolated from the previous packet to this one. */
   readonly interpolatingEntities: ReadonlyArray<Entity>;
   readonly removedEntities: ReadonlyArray<RemovedEntityInfo>;
   readonly playerTribeData: ExtendedTribe;
   readonly enemyTribeData: ReadonlyArray<Tribe>;
   readonly playerInstance: Entity | null;
   readonly cameraSubject: number;
   readonly lights: ReadonlyArray<LightData>;
   readonly hits: ReadonlyArray<EntityHitData>;
   readonly playerKnockbacks: ReadonlyArray<PlayerKnockbackData>;
   readonly heals: ReadonlyArray<EntityHealData>;
   readonly researchOrbCompletes: ReadonlyArray<ResearchOrbCompleteData>;
   readonly tileUpdates: ReadonlyArray<TileUpdateData>;
   readonly wallSubtileUpdates: Map<Layer, ReadonlyArray<WallSubtileUpdateData>>;
   readonly hasPickedUpItem: boolean;
   readonly titleOffer: TribesmanTitle | null;
   readonly entityTickEvents: ReadonlyArray<EntityTickEventData>;
   readonly minedSubtiles: ReadonlyArray<MinedSubtileData>;
   readonly collapses: ReadonlyArray<CollapseData>;
   readonly grassBlockers: ReadonlyArray<GrassBlockerData>;
}

// @Cleanup: when i rework shit this awful existence will go away
// Use prime numbers / 100 to ensure a decent distribution of different types of particles
const HEALING_PARTICLE_AMOUNTS = [0.05, 0.37, 1.01];

const entityShouldInterpolate = (newTransformData: TransformComponentData, previousTransformData: TransformComponentData): boolean => {
   // If any hitboxes' positions or angles have changed
   for (const newHitbox of newTransformData.hitboxes) {
      // Find the previous hitbox
      // @Speed
      let previousHitbox: Hitbox | undefined;
      for (const hitbox of previousTransformData.hitboxes) {
         if (hitbox.localID === newHitbox.localID) {
            previousHitbox = hitbox;
         }
      }
      
      if (typeof previousHitbox !== "undefined") {
         if (newHitbox.box.position.x !== previousHitbox.box.position.x
            || newHitbox.box.position.y !== previousHitbox.box.position.y
            || newHitbox.box.angle !== previousHitbox.box.angle) {
            return true;
         }
      }
   }

   return false;
}

const decodeEntitySnapshot = (reader: PacketReader, interpolatingEntities: Array<Entity>, previousSnapshot: PacketSnapshot | null, entity: Entity): EntitySnapshot => {
   const entityType: EntityType = reader.readNumber();
   const spawnTicks = reader.readNumber();
   
   const layerIdx = reader.readNumber();
   console.assert(Number.isInteger(layerIdx) && layerIdx < layers.length);
   const layer = layers[layerIdx];

   const entityServerComponentTypes = new Array<ServerComponentType>();
   const entityServerComponentData: EntityServerComponentData = {};
   
   // Component data
   const numComponents = reader.readNumber();
   for (let i = 0; i < numComponents; i++) {
      const componentType: ServerComponentType = reader.readNumber();
      assert(!entityServerComponentTypes.includes(componentType));
      entityServerComponentTypes.push(componentType);

      const componentArray = getServerComponentArray(componentType);

      // @Cleanup: cast
      entityServerComponentData[componentType] = componentArray.decodeData(reader) as any;

      // @Speed: lot can be done to improve the way this is done
      if (previousSnapshot !== null && componentType === ServerComponentType.transform) {
         const previousEntityData = previousSnapshot.entities.get(entity);
         if (typeof previousEntityData !== "undefined") {
            const previousTransformComponentData = previousEntityData.serverComponentData[ServerComponentType.transform]!;
            if (entityShouldInterpolate(entityServerComponentData[componentType]!, previousTransformComponentData)) {
               interpolatingEntities.push(entity);
            }
         }
      }
   }
      
   return {
      entityType: entityType,
      spawnTicks: spawnTicks,
      layer: layer,
      serverComponentData: entityServerComponentData,
      // @HACK
      clientComponentData: getEntityClientComponentConfigs(entityType)
   };
}

export function decodeSnapshotFromGameDataPacket(reader: PacketReader, previousSnapshot: PacketSnapshot | null): PacketSnapshot {
   const tick = reader.readNumber();
   
   const time = reader.readNumber();

   const layerIdx = reader.readNumber();
   const layer = layers[layerIdx];

   const numEntities = reader.readNumber();
   const entities = new Map<Entity, EntitySnapshot>();
   const interpolatingEntities = new Array<Entity>();
   for (let i = 0; i < numEntities; i++) {
      const entity = reader.readNumber() as Entity;
      const entitySnapshot = decodeEntitySnapshot(reader, interpolatingEntities, previousSnapshot, entity);
      entities.set(entity, entitySnapshot);
   }

   const numRemovedEntities = reader.readNumber();
   const removedEntities = new Array<RemovedEntityInfo>();
   for (let i = 0; i < numRemovedEntities; i++) {
      const entity = reader.readNumber();
      const isDestroyed = reader.readBool();
      removedEntities.push({
         entity: entity,
         isDestroyed: isDestroyed
      });
   }
   
   // read a useless bool here cuz the tribe data reading stuff expects a premonition bool to be read first
   reader.readBool();
   const playerTribeData = readExtendedTribeData(reader);
   
   const enemyTribeData = new Array<Tribe>();
   const numEnemyTribes = reader.readNumber();
   for (let i = 0; i < numEnemyTribes; i++) {
      const isExtended = reader.readBool();
      const tribeData = isExtended ? readExtendedTribeData(reader) : readShortTribeData(reader);
      enemyTribeData.push(tribeData);
   }

   let playerInstance: Entity | null = reader.readNumber();
   if (playerInstance === 0) {
      playerInstance = null;
   }
   
   const cameraSubject = reader.readNumber() as Entity;

   const lightData = readLightsFromData(reader);

   const hits = new Array<EntityHitData>();
   const numHits = reader.readNumber();
   for (let i = 0; i < numHits; i++) {
      const hitEntity = reader.readNumber() as Entity;
      const hitHitboxLocalID = reader.readNumber();
      const hitPosition = reader.readPoint();
      const attackEffectiveness: AttackEffectiveness = reader.readNumber();
      const damage = reader.readNumber();
      const shouldShowDamageNumber = reader.readBool();
      const flags = reader.readNumber();
      hits.push({
         entity: hitEntity,
         hitboxLocalID: hitHitboxLocalID,
         position: hitPosition,
         attackEffectiveness: attackEffectiveness,
         damage: damage,
         shouldShowDamageNumber: shouldShowDamageNumber,
         flags: flags
      });
   }

   const playerKnockbacks = new Array<PlayerKnockbackData>();
   const numKnockbacks = reader.readNumber();
   for (let i = 0; i < numKnockbacks; i++) {
      const knockback = reader.readNumber();
      const knockbackDirection = reader.readNumber();
      playerKnockbacks.push({
         knockback: knockback,
         knockbackDirection: knockbackDirection
      });
   }

   const heals = new Array<EntityHealData>();
   const numHeals = reader.readNumber();
   for (let i = 0; i < numHeals; i++) {
      const position = reader.readPoint();
      const healedEntity = reader.readNumber() as Entity;
      const healerEntity = reader.readNumber() as Entity;
      const healAmount = reader.readNumber();
      heals.push({
         position: position,
         healedEntity: healedEntity,
         healerEntity: healerEntity,
         healAmount: healAmount
      });
   }

   const researchOrbCompletes = new Array<ResearchOrbCompleteData>();
   const numOrbs = reader.readNumber();
   for (let i = 0; i < numOrbs; i++) {
      const position = reader.readPoint();
      const amount = reader.readNumber();

      researchOrbCompletes.push({
         position: position,
         amount: amount
      });
   }

   const tileUpdates = new Array<TileUpdateData>();
   const numTileUpdates = reader.readNumber();
   console.assert(Number.isInteger(numTileUpdates));
   for (let i = 0; i < numTileUpdates; i++) {
      const layerIdx = reader.readNumber();
      const layer = layers[layerIdx];

      const tileIndex = reader.readNumber();
      const tileType: TileType = reader.readNumber();

      tileUpdates.push({
         layer: layer,
         tileIndex: tileIndex,
         tileType: tileType
      });
   }
   
   const wallSubtileUpdates = new Map<Layer, ReadonlyArray<WallSubtileUpdateData>>();
   for (const layer of layers) {
      const layerSubtileUpdates = new Array<WallSubtileUpdateData>();
      
      const numUpdates = reader.readNumber();
      for (let i = 0; i < numUpdates; i++) {
         const subtileIndex = reader.readNumber();
         const subtileType = reader.readNumber() as SubtileType;
         const damageTaken = reader.readNumber();

         layerSubtileUpdates.push({
            subtileIndex: subtileIndex,
            subtileType: subtileType,
            damageTaken: damageTaken
         });
      }

      wallSubtileUpdates.set(layer, layerSubtileUpdates);
   }

   const hasPickedUpItem = reader.readBool();

   const hasTitleOffer = reader.readBool();
   let titleOffer: TribesmanTitle | null = null;
   if (hasTitleOffer) {
      titleOffer = reader.readNumber();
   }

   const entityTickEvents = new Array<EntityTickEventData>();
   const numEntityTickEvents = reader.readNumber();
   for (let i = 0; i < numEntityTickEvents; i++) {
      const entity = reader.readNumber() as Entity;
      const type = reader.readNumber() as EntityTickEventType;
      const data = reader.readNumber();

      entityTickEvents.push({
         entity: entity,
         type: type,
         data: data
      });
   }

   const minedSubtiles = new Array<MinedSubtileData>();
   const numMinedSubtiles = reader.readNumber();
   for (let i = 0; i < numMinedSubtiles; i++) {
      const subtile = reader.readNumber();
      const subtileType = reader.readNumber() as SubtileType;
      const support = reader.readNumber();
      const isCollapsing = reader.readBool();

      const minedSubtile: MinedSubtileData = {
         subtileIndex: subtile,
         subtileType: subtileType,
         support: support,
         isCollapsing: isCollapsing
      };
      minedSubtiles.push(minedSubtile);
   }
   
   const collapses = new Array<CollapseData>();
   const numCollapses = reader.readNumber();
   assert(Number.isInteger(numCollapses));
   for (let i = 0; i < numCollapses; i++) {
      const collapsingSubtileIndex = reader.readNumber();
      const ageTicks = reader.readNumber();
      collapses.push({
         collapsingSubtileIndex: collapsingSubtileIndex,
         ageTicks: ageTicks
      });
   }

   const grassBlockers = readGrassBlockers(reader);

   return {
      tick: tick,
      time: time,
      layer: layer,
      entities: entities,
      interpolatingEntities: interpolatingEntities,
      removedEntities: removedEntities,
      playerTribeData: playerTribeData,
      enemyTribeData: enemyTribeData,
      playerInstance: playerInstance,
      cameraSubject: cameraSubject,
      lights: lightData,
      hits: hits,
      playerKnockbacks: playerKnockbacks,
      heals: heals,
      researchOrbCompletes: researchOrbCompletes,
      tileUpdates: tileUpdates,
      wallSubtileUpdates: wallSubtileUpdates,
      hasPickedUpItem: hasPickedUpItem,
      titleOffer: titleOffer,
      entityTickEvents: entityTickEvents,
      minedSubtiles: minedSubtiles,
      collapses: collapses,
      grassBlockers: grassBlockers
   };
}

export function createEntityFromData(entity: Entity, data: EntitySnapshot): void {
   const entityComponentData: EntityComponentData = {
      entityType: data.entityType,
      serverComponentData: data.serverComponentData,
      // @HACK
      clientComponentData: data.clientComponentData
   };
   
   const entityCreationInfo = createEntityCreationInfo(entity, entityComponentData);
   addEntityToWorld(data.spawnTicks, data.layer, entityCreationInfo);
}

const updateEntityFromData = (entity: Entity, data: EntitySnapshot): void => {
   const previousLayer = getEntityLayer(entity);
   if (data.layer !== previousLayer) {
      // Change layers
      changeEntityLayer(entity, data.layer);
   }
   
   // Update server components from data
   const componentTypes = getEntityComponentTypes(entity);
   for (const componentType of componentTypes) {
      const componentArray = getServerComponentArray(componentType);
      if (typeof componentArray.updateFromData !== "undefined") {
         const componentData = data.serverComponentData[componentType]!;
         componentArray.updateFromData(componentData, entity);
      }
   }

   // @Speed: Does this mean we can just collect all updated entities each tick and not have to do the dirty array bullshit?
   // If you're updating the entity, then the server must have had some reason to send the data, so we should always consider the entity dirty.
   // @Incomplete: Are there some situations where this isn't the case?
   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
}

// @CLEANUP see comment in txt
const updatePlayerFromData = (playerInstance: number, data: EntitySnapshot): void => {
   // @Copynpaste
   const previousLayer = getEntityLayer(playerInstance);
   if (data.layer !== previousLayer) {
      // Change layers
      changeEntityLayer(playerInstance, data.layer);
   }
   
   const componentTypes = getEntityComponentTypes(playerInstance);
   for (const componentType of componentTypes) {
      const componentArray = getServerComponentArray(componentType);
      if (typeof componentArray.updatePlayerFromData !== "undefined") {
         const componentData = data.serverComponentData[componentType]!;
         // @INCOMPLETE: is never true??
         componentArray.updatePlayerFromData(componentData, false);
      }
   }
}

export function updateGameStateToSnapshot(snapshot: PacketSnapshot): void {
   // @HACK @CLEANUP impure Done before so that server data can override particles
   Board.updateParticles();

   setCurrentSnapshot(snapshot);

   if (snapshot.layer !== getCurrentLayer()) {
      setCurrentLayer(snapshot.layer);
      playHeadSound("layer-change.mp3", 0.55, 1);
   }

   // Update entities
   for (const pair of snapshot.entities) {
      const entity = pair[0] as Entity;
      const entitySnapshot = pair[1];

      if (entity === snapshot.playerInstance) {
         if (entityExists(entity)) {
            updatePlayerFromData(entity, entitySnapshot);
         } else {
            createEntityFromData(entity, entitySnapshot);
         }
      } else {
         if (entityExists(entity)) {
            updateEntityFromData(entity, entitySnapshot);
         } else {
            createEntityFromData(entity, entitySnapshot);
         }
      }
   }

   for (const entityRemoveInfo of snapshot.removedEntities) {
      // @HACK @INCOMPLETE sometimes entities don't exist here... suggesting some deeper bug. This is a shitty hack.
      if (entityExists(entityRemoveInfo.entity)) {
         removeEntity(entityRemoveInfo.entity, entityRemoveInfo.isDestroyed);
      }
   }

   updatePlayerTribe(snapshot.playerTribeData);
   // @GARBAGE
   tribes.splice(0, tribes.length);
   tribes.push(snapshot.playerTribeData);
   for (const tribe of snapshot.enemyTribeData) {
      tribes.push(tribe);
   }
   tribesTabState.updateTribes(tribes);
   
   setPlayerInstance(snapshot.playerInstance);
   setCameraSubject(snapshot.cameraSubject);

   updateLightsFromData(snapshot.lights);

   // @CLEANUP this is so bad in comparison to how clean i've made the rest of this lol, but it'll clear itself up as i change the game in the ways i am planning to
   // Register hits
   for (const hit of snapshot.hits) {
      if (entityExists(hit.entity)) {
         if (hit.attackEffectiveness === AttackEffectiveness.stopped) {
            // Register stopped hit
                     
            const transformComponent = TransformComponentArray.getComponent(hit.entity);
            const hitbox = transformComponent.hitboxes[0];
            for (let i = 0; i < 6; i++) {
               const position = hitbox.box.position.offset(randFloat(0, 6), randAngle());
               createSparkParticle(position.x, position.y);
            }
         } else {
            // Register hit

            const transformComponent = TransformComponentArray.getComponent(hit.entity);

            // If the entity is hit by a flesh sword, create slime puddles
            if (hit.flags & HitFlags.HIT_BY_FLESH_SWORD) {
               const hitbox = transformComponent.hitboxes[0];
               for (let i = 0; i < 2; i++) {
                  createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, 32);
               }
            }

            // @Incomplete @Hack
            if (hit.flags & HitFlags.HIT_BY_SPIKES) {
               playSound("spike-stab.mp3", 0.3, 1, hit.position, getEntityLayer(hit.entity));
            }

            const hitHitbox = getHitboxByLocalID(transformComponent.hitboxes, hit.hitboxLocalID);
            if (hitHitbox !== null) {
               // @Speed
               const componentArrays = getComponentArrays();
               for (let i = 0; i < componentArrays.length; i++) {
                  const componentArray = componentArrays[i];
                  if (typeof componentArray.onHit !== "undefined" && componentArray.hasComponent(hit.entity)) {
                     componentArray.onHit(hit.entity, hitHitbox, hit.position, hit.flags);
                  }
               }
            }
         }
      }
      
      if (hit.damage > 0 && hit.shouldShowDamageNumber) {
         createDamageNumber(hit.position.x, hit.position.y, hit.damage);
      }
   }

   for (const knockbackData of snapshot.playerKnockbacks) {
      if (playerInstance !== null) {
         const transformComponent = TransformComponentArray.getComponent(playerInstance);
         const playerHitbox = transformComponent.hitboxes[0];

         const previousVelocity = getHitboxVelocity(playerHitbox);
         setHitboxVelocity(playerHitbox, previousVelocity.x * 0.5, previousVelocity.y * 0.5);

         addHitboxVelocity(playerHitbox, knockbackData.knockback * Math.sin(knockbackData.knockbackDirection), knockbackData.knockback * Math.cos(knockbackData.knockbackDirection));
      }
   }

   for (const healData of snapshot.heals) {
      const healedEntity = healData.healedEntity;
      const healerEntity = healData.healerEntity as Entity;
      const healAmount = healData.healAmount;

      if (healAmount === 0) {
         continue;
      }

      if (healerEntity === playerInstance) {
         createHealNumber(healedEntity, healData.position.x, healData.position.y, healAmount);
      }

      if (entityExists(healedEntity)) {
         const transformComponent = TransformComponentArray.getComponent(healedEntity);
   
         // Create healing particles depending on the amount the entity was healed
         let remainingHealing = healAmount;
         for (let size = 2; size >= 0;) {
            if (remainingHealing >= HEALING_PARTICLE_AMOUNTS[size]) {
               const position = getRandomPositionInEntity(transformComponent);
               createHealingParticle(position, size);
               remainingHealing -= HEALING_PARTICLE_AMOUNTS[size];
            } else {
               size--;
            }
         }

         // @Hack @Incomplete: This will trigger the repair sound effect even if a hammer isn't the one healing the structure
         if (STRUCTURE_TYPES.includes(getEntityType(healedEntity) as any)) { // @Cleanup
            playSound("repair.mp3", 0.4, 1, healData.position, getEntityLayer(healedEntity));
         }
      }
   }

   for (const orbCompleteData of snapshot.researchOrbCompletes) {
      createResearchNumber(orbCompleteData.position.x, orbCompleteData.position.y, orbCompleteData.amount);
   }

   for (const tileUpdate of snapshot.tileUpdates) {
      const tile = tileUpdate.layer.getTile(tileUpdate.tileIndex);
      tile.type = tileUpdate.tileType;
      updateRenderChunkFromTileUpdate(tileUpdate.tileIndex, tileUpdate.layer);
   }

   for (const layer of layers) {
      const layerSubtileUpdates = snapshot.wallSubtileUpdates.get(layer)!;
      for (const subtileUpdateData of layerSubtileUpdates) {
         layer.registerSubtileUpdate(subtileUpdateData.subtileIndex, subtileUpdateData.subtileType, subtileUpdateData.damageTaken);
      }
   }

   // @Cleanup (this'll go away when i do the sound server-to-client)
   if (snapshot.hasPickedUpItem) {
      playHeadSound("item-pickup.mp3", 0.3, 1);
   }

   infocardsState.setTitleOffer(snapshot.titleOffer);

   for (const entityTickEvent of snapshot.entityTickEvents) {
      processTickEvent(entityTickEvent.entity, entityTickEvent.type, entityTickEvent.data);
   }
   
   setMinedSubtiles(snapshot.minedSubtiles);

   for (const collapse of snapshot.collapses) {
      tickCollapse(collapse.collapsingSubtileIndex, collapse.ageTicks);
   }

   updateGrassBlockersFromData(snapshot.grassBlockers);
}