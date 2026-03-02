import { PotentialBuildingPlanData } from "battletribes-shared/ai-building-types";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TechID, TechTreeUnlockProgress, Tech, getTechByID, TECHS, TechUnlockProgress } from "battletribes-shared/techs";
import { TribeType, TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { Point, randItem, clampToBoardDimensions, TileIndex, getTileIndexIncludingEdges, getTileX, getTileY, assert } from "battletribes-shared/utils";
import Chunk from "./Chunk";
import { TotemBannerComponentArray, addBannerToTotem, removeBannerFromTotem } from "./components/TotemBannerComponent";
import { InventoryComponentArray, getInventory } from "./components/InventoryComponent";
import { getPathfindingGroupID } from "./pathfinding";
import { getPlayerClients, registerResearchOrbComplete } from "./server/player-clients";
import { HutComponentArray } from "./components/HutComponent";
import { ItemType, InventoryName } from "battletribes-shared/items/items";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { addTribe, createEntity, destroyEntity, entityExists, getEntityLayer, getEntityType, getGameTicks, removeTribe } from "./world";
import Layer from "./Layer";
import { EntityConfig } from "./components";
import { createTribeWorkerConfig } from "./entities/tribes/tribe-worker";
import { createTribeWarriorConfig } from "./entities/tribes/tribe-warrior";
import { layers, surfaceLayer, undergroundLayer } from "./layers";
import TribeBuildingLayer, { createEntitiesByEntityType, createVirtualStructuresByEntityType, VirtualStructure } from "./tribesman-ai/building-plans/TribeBuildingLayer";
import { createRootPlanAssignment, updateTribePlans } from "./tribesman-ai/tribesman-ai-planning";
import { getStringLengthBytes, Packet } from "../../shared/src/packets";
import PlayerClient from "./server/PlayerClient";
import { TribeMemberComponentArray } from "./components/TribeMemberComponent";
import { StructureComponentArray } from "./components/StructureComponent";
import { TribesmanComponentArray } from "./components/TribesmanComponent";

const ENEMY_ATTACK_REMEMBER_TIME_TICKS = 30 * Settings.TICK_RATE;
const RESPAWN_TIME_TICKS = 5 * Settings.TICK_RATE;

let tribeIDCounter = 0;

const TRIBE_BUILDING_AREA_INFLUENCES = {
   [EntityType.tribeTotem]: 200,
   [EntityType.workerHut]: 150,
   [EntityType.warriorHut]: 150
} satisfies Partial<Record<EntityType, number>>;

interface TileInfluence {
   readonly tile: TileIndex;
   /** The number of buildings contributing to the tile */
   numInfluences: number;
}

interface ChunkInfluence {
   readonly chunk: Chunk;
   numInfluences: number;
}

const getTribeHomeLayer = (tribeType: TribeType): Layer => {
   switch (tribeType) {
      case TribeType.plainspeople:
      case TribeType.barbarians:
      case TribeType.frostlings:
      case TribeType.goblins: {
         return surfaceLayer;
      }
      case TribeType.dwarves: {
         return undergroundLayer;
      }
   }
}

const NOUNS: ReadonlyArray<string> = [
   "Warmongers",
   "Savages",
   "Adventurers",
   "Guardians",
   "Defenders",
   "Warriors"
];
const ADJECTIVES: ReadonlyArray<string> = [
   "Rabid",
   "Brutal"
];
const ORIGINS: Record<TribeType, string> = {
   [TribeType.barbarians]: "Desert",
   [TribeType.frostlings]: "Tundra",
   [TribeType.goblins]: "Mountains",
   [TribeType.plainspeople]: "Plains",
   [TribeType.dwarves]: "Caves"
};

const generateTribeName = (tribeType: TribeType): string => {
   if (Math.random() < 0.5) {
      // Adjective + Noun + (maybe) origin

      const noun = randItem(NOUNS);
      const adjective = randItem(ADJECTIVES);

      let name = adjective + " " + noun;

      if (Math.random() < 0.5) {
         const origin = ORIGINS[tribeType];
         name += " of the " + origin;
      }

      return name;
   } else {
      // Noun + origin

      const noun = randItem(NOUNS);
      const origin = ORIGINS[tribeType];

      return noun + " of the " + origin;
   }
}

export default class Tribe {
   public readonly name: string;
   public readonly id = tribeIDCounter++;
   
   public tribeType: TribeType;
   public readonly isAIControlled: boolean;
   /** The layer which the tribe will create their base in. */
   public readonly homeLayer: Layer;

   public buildingsAreDirty = true;

   public readonly rootAssignment = createRootPlanAssignment([], true);

   /** Stores all tiles in the tribe's zone of influence */
   private area: Record<number, TileInfluence> = {};
   private chunkArea: Record<number, ChunkInfluence> = {};

   public tribesmanCap: number;

   public selectedTechID: TechID | null = null;
   public readonly unlockedTechs = new Array<Tech>();
   public readonly techTreeUnlockProgress: TechTreeUnlockProgress = {};

   private readonly respawnTimesRemaining = new Array<number>();
   private readonly respawnHutIDs = new Array<number>();

   /** Stores building info for each layer, accessed through the layer's depth */
   public readonly buildingLayers = layers.map(layer => new TribeBuildingLayer(layer, this));

   public potentialPlansData: ReadonlyArray<PotentialBuildingPlanData> = [];

   public availableResources: Partial<Record<ItemType, number>> = {};

   public attackingEntities: Partial<Record<number, number>> = {};

   public virtualEntityIDCounter = 0;

   public entities = new Array<Entity>();
   // @Memory: stores for alll.....
   public entitiesByEntityType = createEntitiesByEntityType();

   // Whereas each building layer stores these only for that building layer, this stores all virtual buildings in every building layer
   public virtualStructures = new Array<VirtualStructure>();
   public virtualStructureRecord: Record<number, VirtualStructure> = {};
   // @Memory: stores for alll.....
   public virtualStructuresByEntityType = createVirtualStructuresByEntityType();

   public readonly pathfindingGroupID: number;

   public autogiveBaseResources = false;

   /**
    * When the tribe starts, there are no reference buildings to determine where future buildings should be placed.
    * So we keep track of the position of the first tribe entity, and use that to decide the placement of the first building.
   */
//   @HACK
   public startPosition: Point;
   
   /** If there ever get to be 0 entities of this tribe, the tribe will be destroyed. */
   public numEntitiesWithTribe = 0;
   public isRemoveable = false;
   
   constructor(tribeType: TribeType, isAIControlled: boolean, startPosition: Point) {
      this.name = generateTribeName(tribeType);
      this.tribeType = tribeType;
      this.isAIControlled = isAIControlled;
      this.startPosition = startPosition;
      this.homeLayer = getTribeHomeLayer(tribeType);

      this.tribesmanCap = TRIBE_INFO_RECORD[tribeType].baseTribesmanCap;
      this.pathfindingGroupID = getPathfindingGroupID();

      addTribe(this);
   }

   public getBuildingLayer(layer: Layer): TribeBuildingLayer {
      return this.buildingLayers[layer.depth];
   }

   public entityIsAttacking(entity: Entity): boolean {
      return typeof this.attackingEntities[entity] !== "undefined";
   }

   public registerEntity(entity: Entity): void {
      this.isRemoveable = true;
      this.numEntitiesWithTribe++;

      const transformComponent = TransformComponentArray.getComponent(entity);
      
      if (StructureComponentArray.hasComponent(entity)) {
         const structureComponent = StructureComponentArray.getComponent(entity);

         const layer = getEntityLayer(entity);
         const buildingLayer = this.buildingLayers[layer.depth];
         buildingLayer.addVirtualBuilding(structureComponent.virtualStructure!);
      }

      const entityType = getEntityType(entity);
      
      this.entities.push(entity);
      this.entitiesByEntityType[entityType].push(entity);

      this.buildingsAreDirty = true;

      switch (entityType) {
         case EntityType.tribeTotem: {
            this.createTribeAreaAroundBuilding(getEntityLayer(entity), transformComponent, TRIBE_BUILDING_AREA_INFLUENCES[EntityType.tribeTotem]);
            break;
         }
         case EntityType.workerHut:
         case EntityType.warriorHut: {
            this.createTribeAreaAroundBuilding(getEntityLayer(entity), transformComponent, TRIBE_BUILDING_AREA_INFLUENCES[entityType]);

            const totems = this.getEntitiesByType(EntityType.tribeTotem);
            assert(totems.length === 1);
            const totem = totems[0];

            const bannerComponent = TotemBannerComponentArray.getComponent(totem);
            const workerHuts = this.getEntitiesByType(EntityType.workerHut);
            const warriorHuts = this.getEntitiesByType(EntityType.warriorHut);
            addBannerToTotem(bannerComponent, workerHuts.length + warriorHuts.length - 1);

            break;
         }
      }
   }

   public deregisterEntity(entity: Entity): void {
      this.numEntitiesWithTribe--;
      assert(this.numEntitiesWithTribe >= 0);

      let idx = this.entities.indexOf(entity);
      assert(idx !== -1);
      this.entities.splice(idx, 1);

      const entityType = getEntityType(entity);

      const entities = this.entitiesByEntityType[entityType];
      idx = entities.indexOf(entity);
      assert(idx !== -1);
      entities.splice(idx, 1);

      if (StructureComponentArray.hasComponent(entity)) {
         const structureComponent = StructureComponentArray.getComponent(entity);
         
         const layer = getEntityLayer(entity);
         const buildingLayer = this.buildingLayers[layer.depth];
         buildingLayer.removeVirtualBuilding(structureComponent.virtualStructure!);
      }
      
      this.buildingsAreDirty = true;

      switch (entityType) {
         case EntityType.workerHut: {
            const totems = this.getEntitiesByType(EntityType.tribeTotem);
            assert(totems.length === 1);
            const totem = totems[0];

            const bannerComponent = TotemBannerComponentArray.getComponent(totem);
            removeBannerFromTotem(bannerComponent, idx);

            const transformComponent = TransformComponentArray.getComponent(entity);
            this.removeBuildingFromTiles(transformComponent, TRIBE_BUILDING_AREA_INFLUENCES[EntityType.workerHut]);
            break;
         }
         case EntityType.warriorHut: {
            const totems = this.getEntitiesByType(EntityType.tribeTotem);
            assert(totems.length === 1);
            const totem = totems[0];

            const bannerComponent = TotemBannerComponentArray.getComponent(totem);
            removeBannerFromTotem(bannerComponent, idx);

            const transformComponent = TransformComponentArray.getComponent(entity);
            this.removeBuildingFromTiles(transformComponent, TRIBE_BUILDING_AREA_INFLUENCES[EntityType.warriorHut]);
            break;
         }
      }
   }

   public addAttackingEntity(attackingEntityID: number): void {
      this.attackingEntities[attackingEntityID] = ENEMY_ATTACK_REMEMBER_TIME_TICKS;
   }

   public unlockTech(tech: Tech): void {
      if (this.unlockedTechs.includes(tech)) {
         return;
      }

      this.unlockedTechs.push(tech);
      this.selectedTechID = null;

      if (this.isAIControlled) {
         updateTribePlans(this);
      }
   }

   public tick(): void {
      // Destroy tribe if it has no entities left
      if (this.isRemoveable && this.numEntitiesWithTribe === 0) {
         // @Speed
         // Make sure there are no players which can still respawn as this tribe
         let hasPlayers = false;
         for (const playerClient of getPlayerClients()) {
            if (playerClient.tribe === this) {
               hasPlayers = true;
               break;
            }
         }
         
         if (!hasPlayers) {
            this.destroy();
            return;
         }
      }

      const attackingEntityIDs = Object.keys(this.attackingEntities).map(idString => Number(idString));
      for (let i = 0; i < attackingEntityIDs.length; i++) {
         const id = attackingEntityIDs[i];
         this.attackingEntities[id]!--;
         if (this.attackingEntities[id] === 0) {
            delete this.attackingEntities[id];
         }
      }

      for (let i = 0; i < this.respawnTimesRemaining.length; i++) {
         if (--this.respawnTimesRemaining[i] <= 0) {
            const hut = this.respawnHutIDs[i];

            this.respawnTimesRemaining.splice(i, 1);
            this.respawnHutIDs.splice(i, 1);

            if (entityExists(hut)) {
               this.createNewTribesman(hut);
            }

            i--;
         }
      }
   }

   public getEntitiesByType(entityType: EntityType): ReadonlyArray<Entity> {
      return this.entitiesByEntityType[entityType];
   }

   public getNumEntitiesOfType(entityType: EntityType): number {
      return this.entitiesByEntityType[entityType].length;
   }

   public respawnTribesman(hut: Entity): void {
      this.respawnTimesRemaining.push(RESPAWN_TIME_TICKS);
      this.respawnHutIDs.push(hut);
   }

   public instantRespawnTribesman(hut: Entity): void {
      this.respawnTimesRemaining.push(1);
      this.respawnHutIDs.push(hut);
   }

   public createNewTribesman(hut: Entity): void {
      // Make sure the hut doesn't already have a tribesman or is in the process of respawning one
      const hutComponent = HutComponentArray.getComponent(hut);
      if (hutComponent.hasSpawnedTribesman || this.respawnHutIDs.indexOf(hut) !== -1) {
         return;
      }

      hutComponent.lastDoorSwingTicks = getGameTicks();
      hutComponent.hasSpawnedTribesman = true;
      hutComponent.hasTribesman = true;
      
      const transformComponent = TransformComponentArray.getComponent(hut);
      const hutHitbox = transformComponent.hitboxes[0];
      
      // Offset the spawn position so the tribesman comes out of the correct side of the hut
      const position = new Point(hutHitbox.box.position.x + 10 * Math.sin(hutHitbox.box.angle), hutHitbox.box.position.y + 10 * Math.cos(hutHitbox.box.angle));
      
      let config: EntityConfig;
      switch (getEntityType(hut)) {
         case EntityType.workerHut: {
            config = createTribeWorkerConfig(position, hutHitbox.box.angle, this);
            break;
         }
         case EntityType.warriorHut: {
            config = createTribeWarriorConfig(position, hutHitbox.box.angle, this);
            break;
         }
         default: {
            throw new Error();
         }
      }

      config.components[ServerComponentType.tribesmanAI]!.hut = hut;
      createEntity(config, getEntityLayer(hut), 0);
   }

   /** Destroys the tribe and all its associated buildings */
   // @Incomplete
   private destroy(): void {
      // Remove huts
      for (const hut of this.getEntitiesByType(EntityType.workerHut)) {
         destroyEntity(hut);
      }
      for (const hut of this.getEntitiesByType(EntityType.warriorHut)) {
         destroyEntity(hut);
      }

      removeTribe(this);
   }

   private createTribeAreaAroundBuilding(layer: Layer, structureTransformComponent: TransformComponent, influence: number): void {
      const minTileX = clampToBoardDimensions(Math.floor((structureTransformComponent.boundingAreaMinX - influence) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((structureTransformComponent.boundingAreaMaxX + influence) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((structureTransformComponent.boundingAreaMinY - influence) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((structureTransformComponent.boundingAreaMaxY + influence) / Settings.TILE_SIZE));

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            this.addTileToArea(layer, tileX, tileY);
         }
      }
   }

   private removeBuildingFromTiles(structureTransformComponent: TransformComponent, influence: number): void {
      const minTileX = clampToBoardDimensions(Math.floor((structureTransformComponent.boundingAreaMinX - influence) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((structureTransformComponent.boundingAreaMaxX + influence) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((structureTransformComponent.boundingAreaMinY - influence) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((structureTransformComponent.boundingAreaMaxY + influence) / Settings.TILE_SIZE));

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            this.removeTileFromArea(tileX, tileY);
         }
      }
   }

   private removeTileFromArea(tileX: number, tileY: number): void {
      const tileIndex = tileY * Settings.WORLD_SIZE_TILES + tileX;
      
      if (!this.area.hasOwnProperty(tileIndex)) {
         return;
      } else {
         this.area[tileIndex].numInfluences--;
         if (this.area[tileIndex].numInfluences === 0) {
            delete this.area[tileIndex];
         }
      }

      const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
      const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
      const chunkIndex = chunkY * Settings.WORLD_SIZE_CHUNKS + chunkX;
      if (!this.chunkArea.hasOwnProperty(chunkIndex)) {
         return;
      } else {
         this.chunkArea[chunkIndex].numInfluences--;
         if (this.chunkArea[chunkIndex].numInfluences === 0) {
            delete this.chunkArea[chunkIndex];
         }
      }
   }

   private addTileToArea(layer: Layer, tileX: number, tileY: number): void {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      
      if (!this.area.hasOwnProperty(tileIndex)) {
         // If the tile isn't in the area, create a new record
         this.area[tileIndex] = {
            tile: tileIndex,
            numInfluences: 1
         };
      } else {
         this.area[tileIndex].numInfluences++;
      }

      const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
      const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
      const chunkIndex = chunkY * Settings.WORLD_SIZE_CHUNKS + chunkX;
      if (!this.chunkArea.hasOwnProperty(chunkIndex)) {
         const chunk = layer.getChunk(chunkX, chunkY);
         this.chunkArea[chunkIndex] = {
            chunk: chunk,
            numInfluences: 1
         };
      } else {
         this.chunkArea[chunkIndex].numInfluences++;
      }
   }

   public tileIsInArea(tileIndex: number): boolean {
      return this.area.hasOwnProperty(tileIndex);
   }

   public numTiles(): number {
      return Object.keys(this.area).length;
   }

   public getArea(): Array<TileIndex> {
      // @Speed @Garbage
      const area = new Array<TileIndex>();
      for (const tileInfluence of Object.values(this.area)) {
         area.push(tileInfluence.tile);
      }
      return area;
   }

   public techIsComplete(tech: Tech): boolean {
      if (this.techTreeUnlockProgress[tech.id] === undefined) {
         return false;
      }
      
      // Check item requirements
      for (const entry of tech.researchItemRequirements.getEntries()) {
         const itemType = entry.itemType;
         const itemAmountRequired = entry.count;
         
         const progress = this.techTreeUnlockProgress[tech.id]!.itemProgress[itemType];
         if (progress === undefined || progress < itemAmountRequired) {
            return false;
         }
      }

      if (this.techRequiresResearching(tech)) {
         return false;
      }

      return true;
   }

   public studyTech(tech: Tech, researcherX: number, researcherY: number, studyAmount: number): void {
      if (!this.techTreeUnlockProgress.hasOwnProperty(tech.id)) {
         this.techTreeUnlockProgress[tech.id] = {
            itemProgress: {},
            studyProgress: studyAmount
         }
      } else {
         this.techTreeUnlockProgress[tech.id]!.studyProgress += studyAmount;
         
         // Don't go over the study requirements
         const techInfo = getTechByID(tech.id);
         if (this.techTreeUnlockProgress[tech.id]!.studyProgress > techInfo.researchStudyRequirements) {
            this.techTreeUnlockProgress[tech.id]!.studyProgress = techInfo.researchStudyRequirements;
         }
      }

      registerResearchOrbComplete({
         x: researcherX,
         y: researcherY,
         amount: studyAmount
      });
   }

   public hasUnlockedTech(tech: Tech): boolean {
      return this.unlockedTechs.indexOf(tech) !== -1;
   }

   public forceUnlockTech(tech: Tech): void {
      if (this.hasUnlockedTech(tech) || tech.blacklistedTribes.includes(this.tribeType)) {
         return;
      }

      if (!this.techTreeUnlockProgress.hasOwnProperty(tech.id)) {
         this.techTreeUnlockProgress[tech.id] = {
            itemProgress: {},
            studyProgress: 0
         };
      }
      this.techTreeUnlockProgress[tech.id]!.studyProgress = tech.researchStudyRequirements;
      for (const entry of tech.researchItemRequirements.getEntries()) {
         this.techTreeUnlockProgress[tech.id]!.itemProgress[entry.itemType] = entry.count;
      }
      
      this.unlockTech(tech);
   }

   public unlockAllTechs(): void {
      for (const tech of TECHS) {
         this.forceUnlockTech(tech);
      }
   }

   public techRequiresResearching(tech: Tech): boolean {
      if (!this.techTreeUnlockProgress.hasOwnProperty(tech.id)) {
         return true;
      }

      const studyProgress = this.techTreeUnlockProgress[tech.id]!.studyProgress;
      return studyProgress < tech.researchStudyRequirements;
   }

   public updateAvailableResources(): void {
      const newAvailableResources: Partial<Record<ItemType, number>> = {};
      
      const barrels = this.getEntitiesByType(EntityType.barrel);
      for (let i = 0; i < barrels.length; i++) {
         const barrel = barrels[i];

         const inventoryComponent = InventoryComponentArray.getComponent(barrel);
         const inventory = getInventory(inventoryComponent, InventoryName.inventory);

         for (let i = 0; i < inventory.items.length; i++) {
            const item = inventory.items[i];
            if (!newAvailableResources.hasOwnProperty(item.type)) {
               newAvailableResources[item.type] = item.count;
            } else {
               newAvailableResources[item.type]! += item.count;
            }
         }
      }

      this.availableResources = newAvailableResources;
   }
}

export function shouldAddTribeExtendedData(playerClient: PlayerClient, tribe: Tribe): boolean {
   return tribe === playerClient.tribe || playerClient.isDev;
}

export function getShortTribeDataLength(tribe: Tribe): number {
   return getStringLengthBytes(tribe.name) + 3 * Float32Array.BYTES_PER_ELEMENT;
}

export function getExtendedTribeDataLength(tribe: Tribe): number {
   let lengthBytes = getShortTribeDataLength(tribe);
   
   // Has totem, num huts, tribesman cap
   lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;

   // Tribe area
   const area = tribe.getArea();
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * area.length;

   // Selected tech id
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;

   // Unlocked techs
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * tribe.unlockedTechs.length;
   
   // Tech tree unlock progress
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   // @Copynpaste
   const unlockProgressEntries = Object.entries(tribe.techTreeUnlockProgress).map(([a, b]) => [Number(a), b]) as Array<[number, TechUnlockProgress]>;
   for (const [, unlockProgress] of unlockProgressEntries) {
      lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
      
      const numItemRequirements = Object.keys(unlockProgress.itemProgress).length;
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * numItemRequirements;
   }

   // Tribesmen
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   // @Speed
   for (const tribesman of tribe.entities) {
      if (!TribesmanComponentArray.hasComponent(tribesman)) {
         continue;
      }
      
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
      // Name
      const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman);
      lengthBytes += getStringLengthBytes(tribeMemberComponent.name);
   }

   return lengthBytes;
}

const addTribeData = (packet: Packet, tribe: Tribe): void => {
   packet.writeString(tribe.name);
   packet.writeNumber(tribe.id);
   packet.writeNumber(tribe.tribeType);
}

export function addShortTribeData(packet: Packet, tribe: Tribe): void {
   packet.writeBool(false);
   addTribeData(packet, tribe);
}

export function addExtendedTribeData(packet: Packet, tribe: Tribe): void {
   packet.writeBool(true);
   addTribeData(packet, tribe);
   
   const totems = tribe.getEntitiesByType(EntityType.tribeTotem);
   packet.writeBool(totems.length > 0);
   
   const workerHuts = tribe.getEntitiesByType(EntityType.workerHut);
   const warriorHuts = tribe.getEntitiesByType(EntityType.warriorHut);
   const numHuts = workerHuts.length + warriorHuts.length;
   packet.writeNumber(numHuts);

   packet.writeNumber(tribe.tribesmanCap);

   const area = tribe.getArea();
   packet.writeNumber(area.length);
   for (const tileIndex of area) {
      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);
      packet.writeNumber(tileX);
      packet.writeNumber(tileY);
   }

   packet.writeNumber(tribe.selectedTechID !== null ? tribe.selectedTechID : -1);

   packet.writeNumber(tribe.unlockedTechs.length);
   for (const tech of tribe.unlockedTechs) {
      packet.writeNumber(tech.id);
   }

   // Tech tree unlock progress
   const unlockProgressEntries = Object.entries(tribe.techTreeUnlockProgress).map(([a, b]) => [Number(a), b]) as Array<[number, TechUnlockProgress]>;
   packet.writeNumber(unlockProgressEntries.length);
   for (const [techID, unlockProgress] of unlockProgressEntries) {
      packet.writeNumber(techID);

      const itemRequirementEntries = Object.entries(unlockProgress.itemProgress).map(([a, b]) => [Number(a), b]) as Array<[ItemType, number]>;
      packet.writeNumber(itemRequirementEntries.length);
      for (const [itemType, amount] of itemRequirementEntries) {
         packet.writeNumber(itemType);
         packet.writeNumber(amount);
      }
      
      packet.writeNumber(unlockProgress.studyProgress);
   }

   // Tribesmen
   // @SPEED
   let numTribesman = 0;
   for (const entity of tribe.entities) {
      if (TribesmanComponentArray.hasComponent(entity)) {
         numTribesman++;
      }
   }
   packet.writeNumber(numTribesman);
   for (const tribesman of tribe.entities) {
      if (!TribesmanComponentArray.hasComponent(tribesman)) {
         continue;
      }
      
      // ID
      packet.writeNumber(tribesman);
      // Entity type
      packet.writeNumber(getEntityType(tribesman));
      // Name
      const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman);
      packet.writeString(tribeMemberComponent.name);
   }
}