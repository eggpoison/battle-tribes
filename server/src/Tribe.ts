import { PotentialBuildingPlanData } from "webgl-test-shared/dist/ai-building-types";
import { BlueprintType } from "webgl-test-shared/dist/components";
import { CraftingRecipe } from "webgl-test-shared/dist/crafting-recipes";
import { EntityType } from "webgl-test-shared/dist/entities";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StructureType } from "webgl-test-shared/dist/structures";
import { TechID, TechTreeUnlockProgress, TechInfo, getTechByID, TECHS } from "webgl-test-shared/dist/techs";
import { TribeType, TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { Point, angle, randItem, clampToBoardDimensions } from "webgl-test-shared/dist/utils";
import Board from "./Board";
import Tile from "./Tile";
import Chunk from "./Chunk";
import Entity from "./Entity";
import { createTribeWorker } from "./entities/tribes/tribe-worker";
import { TotemBannerComponent, TotemBannerComponentArray, addBannerToTotem, removeBannerFromTotem } from "./components/TotemBannerComponent";
import { createTribeWarrior } from "./entities/tribes/tribe-warrior";
import { SafetyNode, addHitboxesOccupiedNodes, createRestrictedBuildingArea, getSafetyNode } from "./ai-tribe-building/ai-building";
import { InventoryComponentArray, getInventory } from "./components/InventoryComponent";
import { TribeArea } from "./ai-tribe-building/ai-building-areas";
import { cleanAngle } from "./ai-shared";
import { getPathfindingGroupID } from "./pathfinding";
import { registerResearchOrbComplete } from "./server/player-clients";
import { HutComponentArray } from "./components/HutComponent";
import { HitboxVertexPositions } from "webgl-test-shared/dist/hitboxes/hitboxes";

const ENEMY_ATTACK_REMEMBER_TIME_TICKS = 30 * Settings.TPS;
const RESPAWN_TIME_TICKS = 5 * Settings.TPS;

let idCounter = 0;

const getAvailableID = (): number => {
   return idCounter++;
}

const TRIBE_BUILDING_AREA_INFLUENCES = {
   [EntityType.tribeTotem]: 200,
   [EntityType.workerHut]: 150,
   [EntityType.warriorHut]: 150
} satisfies Partial<Record<EntityType, number>>;

interface TileInfluence {
   readonly tile: Tile;
   /** The number of buildings contributing to the tile */
   numInfluences: number;
}

interface ChunkInfluence {
   readonly chunk: Chunk;
   numInfluences: number;
}

export const enum BuildingPlanType {
   newBuilding,
   upgrade
}

interface BaseBuildingPlan {
   readonly type: BuildingPlanType;
   assignedTribesmanID: number;
   potentialPlans: ReadonlyArray<PotentialBuildingPlanData>;
}

export interface NewBuildingPlan extends BaseBuildingPlan {
   readonly type: BuildingPlanType.newBuilding;
   readonly position: Point;
   readonly rotation: number;
   readonly buildingRecipe: CraftingRecipe;
}

export interface BuildingUpgradePlan extends BaseBuildingPlan {
   readonly type: BuildingPlanType.upgrade;
   readonly baseBuildingID: number;
   readonly rotation: number;
   readonly blueprintType: BlueprintType;
   readonly entityType: StructureType;
}

export type BuildingPlan = NewBuildingPlan | BuildingUpgradePlan;

export interface RestrictedBuildingArea {
   readonly position: Point;
   readonly width: number;
   readonly height: number;
   readonly rotation: number;
   /** The ID of the building responsible for the restricted area */
   readonly associatedBuildingID: number;
   readonly vertexOffsets: HitboxVertexPositions;
}

export interface VirtualBuilding {
   readonly id: number;
   readonly position: Readonly<Point>;
   readonly rotation: number;
   readonly entityType: StructureType;
   readonly occupiedNodes: Set<SafetyNode>;
}

export interface TribeWallInfo {
   readonly wall: VirtualBuilding;
   readonly topSideNodes: Array<SafetyNode>;
   readonly rightSideNodes: Array<SafetyNode>;
   readonly bottomSideNodes: Array<SafetyNode>;
   readonly leftSideNodes: Array<SafetyNode>;
   connectionBitset: number;
}

/** The 4 lines of nodes directly outside a wall. */
type WallNodeSides = [Array<SafetyNode>, Array<SafetyNode>, Array<SafetyNode>, Array<SafetyNode>];

// @Cleanup: Move this logic out of the Tribe.ts file

const getWallSideNodeDir = (node: SafetyNode, wall: VirtualBuilding): number => {
   const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
   const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);
   const x = (nodeX + 0.5) * Settings.SAFETY_NODE_SEPARATION;
   const y = (nodeY + 0.5) * Settings.SAFETY_NODE_SEPARATION;

   let dir = angle(x - wall.position.x, y - wall.position.y) - wall.rotation;
   dir += Math.PI/4;
   dir = cleanAngle(dir);

   return dir;
}

const getWallNodeSides = (wall: VirtualBuilding): WallNodeSides => {
   // Find border nodes
   const borderNodes = new Set<SafetyNode>();
   for (const node of wall.occupiedNodes) {
      const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
      const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

      // Top
      if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const node = getSafetyNode(nodeX, nodeY + 1);
         if (!wall.occupiedNodes.has(node)) {
            borderNodes.add(node);
         }
      }

      // Right
      if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const node = getSafetyNode(nodeX + 1, nodeY);
         if (!wall.occupiedNodes.has(node)) {
            borderNodes.add(node);
         }
      }

      // Bottom
      if (nodeY > 0) {
         const node = getSafetyNode(nodeX, nodeY - 1);
         if (!wall.occupiedNodes.has(node)) {
            borderNodes.add(node);
         }
      }

      // Left
      if (nodeX > 0) {
         const node = getSafetyNode(nodeX - 1, nodeY);
         if (!wall.occupiedNodes.has(node)) {
            borderNodes.add(node);
         }
      }
   }
   
   const topNodes = new Array<SafetyNode>();
   const rightNodes = new Array<SafetyNode>();
   const bottomNodes = new Array<SafetyNode>();
   const leftNodes = new Array<SafetyNode>();

   // Sort the border nodes based on their dir
   const sortedBorderNodes = new Array<SafetyNode>();
   for (const node of borderNodes) {
      const nodeDir = getWallSideNodeDir(node, wall);
      
      let insertIdx = 0;
      for (let i = 0; i < sortedBorderNodes.length; i++) {
         const currentNode = sortedBorderNodes[i];
         const currentNodeDir = getWallSideNodeDir(currentNode, wall);
         if (nodeDir < currentNodeDir) {
            break;
         }
         insertIdx++;
      }

      sortedBorderNodes.splice(insertIdx, 0, node);
   }

   const separation = 0.2;

   for (const node of sortedBorderNodes) {
      const dir = getWallSideNodeDir(node, wall);
      if (dir > separation && dir < Math.PI/2 - separation) {
         topNodes.push(node);
      } else if (dir > Math.PI/2 + separation && dir < Math.PI - separation) {
         rightNodes.push(node);
      } else if (dir > Math.PI + separation && dir < Math.PI*3/2 - separation) {
         bottomNodes.push(node)
      } else if (dir > Math.PI*3/2 + separation && dir < Math.PI*2 - separation) {
         leftNodes.push(node);
      }
   }

   return [topNodes, rightNodes, bottomNodes, leftNodes];
}

const wallSideIsConnected = (tribe: Tribe, sideNodes: ReadonlyArray<SafetyNode>): boolean => {
   // Make sure all nodes of the side link to another wall, except for the first and last
   for (let i = 1; i < sideNodes.length - 1; i++) {
      const node = sideNodes[i];
      if (!tribe.occupiedSafetyNodes.has(node)) {
         return false;
      }

      // Only make connections between walls and doors
      const buildingIDs = tribe.occupiedNodeToEntityIDRecord[node];
      for (let i = 0; i < buildingIDs.length; i++) {
         const buildingID = buildingIDs[i];
         const virtualBuilding = tribe.virtualBuildingRecord[buildingID];
         if (virtualBuilding.entityType !== EntityType.wall && virtualBuilding.entityType !== EntityType.door) {
            return false;
         }
      }
   }

   return true;
}

const getWallConnectionBitset = (tribe: Tribe, topWallSide: ReadonlyArray<SafetyNode>, rightWallSide: ReadonlyArray<SafetyNode>, bottomWallSide: ReadonlyArray<SafetyNode>, leftWallSide: ReadonlyArray<SafetyNode>): number => {
   let connections = 0;

   if (wallSideIsConnected(tribe, topWallSide)) {
      connections |= 0b1;
   }
   if (wallSideIsConnected(tribe, rightWallSide)) {
      connections |= 0b10;
   }
   if (wallSideIsConnected(tribe, bottomWallSide)) {
      connections |= 0b100;
   }
   if (wallSideIsConnected(tribe, leftWallSide)) {
      connections |= 0b1000;
   }

   return connections;
}

export function updateTribeWalls(tribe: Tribe): void {
   for (let i = 0; i < tribe.virtualBuildings.length; i++) {
      const virtualBuilding = tribe.virtualBuildings[i];
      if (virtualBuilding.entityType !== EntityType.wall) {
         continue;
      }
      
      const wallInfo = tribe.wallInfoRecord[virtualBuilding.id];
      wallInfo.connectionBitset = getWallConnectionBitset(tribe, wallInfo.topSideNodes, wallInfo.rightSideNodes, wallInfo.bottomSideNodes, wallInfo.leftSideNodes);
   }
}

export function getNumWallConnections(wallConnectionBitset: number): number {
   let numConnections = 0;
   if ((wallConnectionBitset & 0b0001) !== 0) {
      numConnections++;
   }
   if ((wallConnectionBitset & 0b0010) !== 0) {
      numConnections++;
   }
   if ((wallConnectionBitset & 0b0100) !== 0) {
      numConnections++;
   }
   if ((wallConnectionBitset & 0b1000) !== 0) {
      numConnections++;
   }
   return numConnections;
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
   [TribeType.plainspeople]: "Plains"
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

class Tribe {
   public readonly name: string;
   public readonly id: number;
   
   public readonly type: TribeType;
   public readonly isAIControlled: boolean;

   public totem: Entity | null = null;
   
   // /** Stores all tribe huts belonging to the tribe */
   private readonly huts = new Array<Entity>();

   public barrels = new Array<Entity>();

   public readonly researchBenches = new Array<Entity>();

   public readonly buildings = new Array<Entity>();
   public buildingsAreDirty = true;

   // @Cleanup: unify these two
   public buildingPlans = new Array<BuildingPlan>();
   public personalBuildingPlans = new Array<BuildingPlan>();

   /** Stores all tiles in the tribe's zone of influence */
   private area: Record<number, TileInfluence> = {};
   private chunkArea: Record<number, ChunkInfluence> = {};

   public tribesmanCap: number;

   public selectedTechID: TechID | null = null;
   public readonly unlockedTechs = new Array<TechID>();
   public readonly techTreeUnlockProgress: TechTreeUnlockProgress = {};

   private readonly respawnTimesRemaining = new Array<number>();
   private readonly respawnHutIDs = new Array<number>();

   public tribesmanIDs = new Array<number>();

   public virtualBuildings = new Array<VirtualBuilding>;
   public virtualBuildingRecord: Record<number, VirtualBuilding> = {};
   public wallInfoRecord: Record<number, TribeWallInfo> = {};

   public safetyRecord: Record<SafetyNode, number> = {};
   public occupiedSafetyNodes = new Set<SafetyNode>();
   public safetyNodes = new Set<SafetyNode>();

   public occupiedNodeToEntityIDRecord: Record<SafetyNode, Array<number>> = {};

   public areas = new Array<TribeArea>();
   public nodeToAreaIDRecord: Record<SafetyNode, number> = {};
   
   public restrictedBuildingAreas = new Array<RestrictedBuildingArea>();

   public potentialPlansData: ReadonlyArray<PotentialBuildingPlanData> = [];

   public availableResources: Partial<Record<ItemType, number>> = {};

   public attackingEntities: Partial<Record<number, number>> = {};

   public virtualEntityIDCounter = 999999999;

   public readonly pathfindingGroupID: number;
   
   constructor(tribeType: TribeType, isAIControlled: boolean) {
      this.name = generateTribeName(tribeType);
      this.id = getAvailableID();
      this.type = tribeType;
      this.isAIControlled = isAIControlled;

      this.tribesmanCap = TRIBE_INFO_RECORD[tribeType].baseTribesmanCap;
      this.pathfindingGroupID = getPathfindingGroupID();

      Board.addTribe(this);
   }

   public addBuilding(building: Entity<StructureType>): void {
      const occupiedSafetyNodes = new Set<SafetyNode>();
      addHitboxesOccupiedNodes(building.hitboxes, occupiedSafetyNodes);
      
      this.buildings.push(building);

      this.addVirtualBuilding({
         id: building.id,
         position: building.position.copy(),
         rotation: building.rotation,
         entityType: building.type,
         occupiedNodes: occupiedSafetyNodes
      });

      this.buildingsAreDirty = true;

      switch (building.type) {
         case EntityType.tribeTotem: {
            if (this.totem !== null) {
               console.warn("Tribe already has a totem.");
               return;
            }

            this.totem = building;

            this.createTribeAreaAroundBuilding(building.position, TRIBE_BUILDING_AREA_INFLUENCES[EntityType.tribeTotem]);
            break;
         }
         case EntityType.researchBench: {
            this.researchBenches.push(building);
            break;
         }
         case EntityType.workerHut:
         case EntityType.warriorHut: {
            if (this.totem === null) {
               console.warn("Can't register a hut without a totem!");
               return;
            }

            this.huts.push(building);

            this.createTribeAreaAroundBuilding(building.position, TRIBE_BUILDING_AREA_INFLUENCES[building.type]);
            
            // @Hack
            let bannerComponent: TotemBannerComponent;
            if (TotemBannerComponentArray.hasComponent(this.totem.id)) {
               bannerComponent = TotemBannerComponentArray.getComponent(this.totem.id);
            } else {
               bannerComponent = TotemBannerComponentArray.getComponentFromBuffer(this.totem);
            }

            addBannerToTotem(bannerComponent, this.huts.length - 1);
            break;
         }
         case EntityType.barrel: {
            this.barrels.push(building);
            break;
         }
      }
   }

   public removeBuilding(building: Entity): void {
      this.buildings.splice(this.buildings.indexOf(building), 1);

      const virtualBuilding = this.virtualBuildingRecord[building.id];
      this.removeVirtualBuilding(virtualBuilding.id);
      
      this.buildingsAreDirty = true;

      switch (building.type) {
         case EntityType.tribeTotem: {
            this.totem = null;
            break;
         }
         case EntityType.researchBench: {
            const idx = this.researchBenches.indexOf(building);
            if (idx !== -1) {
               this.researchBenches.splice(idx, 1);
            }
            break;
         }
         case EntityType.workerHut: {
            const idx = this.huts.indexOf(building);
            if (idx !== -1) {
               this.huts.splice(idx, 1);
            }

            if (this.totem !== null) {
               const bannerComponent = TotemBannerComponentArray.getComponent(this.totem.id);
               removeBannerFromTotem(bannerComponent, idx);
            }

            this.removeBuildingFromTiles(building.position, TRIBE_BUILDING_AREA_INFLUENCES[EntityType.workerHut]);
            break;
         }
         case EntityType.warriorHut: {
            const idx = this.huts.indexOf(building);
            if (idx !== -1) {
               this.huts.splice(idx, 1);
            }

            if (this.totem !== null) {
               const bannerComponent = TotemBannerComponentArray.getComponent(this.totem.id);
               removeBannerFromTotem(bannerComponent, idx);
            }

            this.removeBuildingFromTiles(building.position, TRIBE_BUILDING_AREA_INFLUENCES[EntityType.warriorHut]);
            break;
         }
         case EntityType.barrel: {
            const idx = this.barrels.indexOf(building);
            if (idx !== -1) {
               this.barrels.splice(idx, 1);
            }
            break;
         }
      }
   }

   public addVirtualBuilding(virtualBuilding: VirtualBuilding): void {
      this.virtualBuildings.push(virtualBuilding);
      this.virtualBuildingRecord[virtualBuilding.id] = virtualBuilding;

      switch (virtualBuilding.entityType) {
         case EntityType.wall: {
            const sides = getWallNodeSides(virtualBuilding);
            const wallInfo: TribeWallInfo = {
               wall: virtualBuilding,
               topSideNodes: sides[0],
               rightSideNodes: sides[1],
               bottomSideNodes: sides[2],
               leftSideNodes: sides[3],
               connectionBitset: getWallConnectionBitset(this, sides[0], sides[1], sides[2], sides[3])
            };
            this.wallInfoRecord[virtualBuilding.id] = wallInfo;
            break;
         }
      }

      switch (virtualBuilding.entityType) {
         case EntityType.workerHut: {
            const offsetAmount = 88 / 2 + 55;
            const x = virtualBuilding.position.x + offsetAmount * Math.sin(virtualBuilding.rotation);
            const y = virtualBuilding.position.y + offsetAmount * Math.cos(virtualBuilding.rotation);

            const restrictedArea = createRestrictedBuildingArea(new Point(x, y), 100, 70, virtualBuilding.rotation, virtualBuilding.id);
            this.restrictedBuildingAreas.push(restrictedArea);
            
            break;
         }
         case EntityType.warriorHut: {
            // @Incomplete

            break;
         }
         case EntityType.door: {
            for (let i = 0; i < 2; i++) {
               const offsetAmount = 16 / 2 + 50;
               const offsetDirection = virtualBuilding.rotation + (i === 1 ? Math.PI : 0);
               const position = virtualBuilding.position.offset(offsetAmount, offsetDirection);
            
               const restrictedArea = createRestrictedBuildingArea(position, 50, 50, offsetDirection, virtualBuilding.id);
               this.restrictedBuildingAreas.push(restrictedArea);
            }
            break;
         }
         case EntityType.workbench: {
            const offsetAmount = 80 / 2 + 55;
            const offsetDirection = virtualBuilding.rotation + Math.PI;
            const position = virtualBuilding.position.offset(offsetAmount, offsetDirection);

            const restrictedArea = createRestrictedBuildingArea(position, 80, 80, offsetDirection, virtualBuilding.id);
            this.restrictedBuildingAreas.push(restrictedArea);
            
            break;
         }
      }
   }

   public removeVirtualBuilding(virtualBuildingID: number): void {
      delete this.virtualBuildingRecord[virtualBuildingID];
      
      let virtualBuilding!: VirtualBuilding;
      let hasFoundBuilding = false;
      for (let i = 0; i < this.virtualBuildings.length; i++) {
         const currentVirtualBuilding = this.virtualBuildings[i];
         if (currentVirtualBuilding.id === virtualBuildingID) {
            this.virtualBuildings.splice(i, 1);
            virtualBuilding = currentVirtualBuilding;

            switch (currentVirtualBuilding.entityType) {
               case EntityType.wall: {
                  delete this.wallInfoRecord[virtualBuildingID];
                  break;
               }
            }

            hasFoundBuilding = true;
            break;
         }
      }
      if (!hasFoundBuilding) {
         throw new Error();
      }

      switch (virtualBuilding.entityType) {
         case EntityType.wall: {
            delete this.wallInfoRecord[virtualBuilding.id];
            break;
         }
      }
      
      // Remove restricted areas
      for (let i = 0; i < this.restrictedBuildingAreas.length; i++) {
         const restrictedArea = this.restrictedBuildingAreas[i];

         if (restrictedArea.associatedBuildingID === virtualBuilding.id) {
            this.restrictedBuildingAreas.splice(i, 1);
            i--;
         }
      }
   }

   public addAttackingEntity(attackingEntityID: number): void {
      this.attackingEntities[attackingEntityID] = ENEMY_ATTACK_REMEMBER_TIME_TICKS;
   }

   public unlockTech(techID: TechID): void {
      if (!this.unlockedTechs.includes(techID)) {
         this.unlockedTechs.push(techID);
         this.selectedTechID = null;
      }
   }

   public tick(): void {
      // @Incomplete: automatically detect if there are no entities left which have a tribe component with this tribe
      // Destroy tribe if it has no entities left
      if (this.totem === null && this.tribesmanIDs.length === 0 && this.buildings.length === 0) {
         this.destroy();
         return;
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
            const hutID = this.respawnHutIDs[i];

            this.respawnTimesRemaining.splice(i, 1);
            this.respawnHutIDs.splice(i, 1);

            const hut = Board.entityRecord[hutID];
            if (typeof hut !== "undefined") {
               this.createNewTribesman(hut);
            }

            i--;
         }
      }
   }

   public hasTotem(): boolean {
      return this.totem !== null;
   }

   public respawnTribesman(hut: Entity): void {
      this.respawnTimesRemaining.push(RESPAWN_TIME_TICKS);
      this.respawnHutIDs.push(hut.id);
   }

   public instantRespawnTribesman(hut: Entity): void {
      this.respawnTimesRemaining.push(1);
      this.respawnHutIDs.push(hut.id);
   }

   public createNewTribesman(hut: Entity): void {
      // Make sure the hut doesn't already have a tribesman or is in the process of respawning one
      const hutComponent = HutComponentArray.getComponent(hut.id);
      if (hutComponent.hasSpawnedTribesman || this.respawnHutIDs.indexOf(hut.id) !== -1) {
         return;
      }
      
      hutComponent.lastDoorSwingTicks = Board.ticks;
      hutComponent.hasSpawnedTribesman = true;
      hutComponent.hasTribesman = true;
      
      // Offset the spawn position so the tribesman comes out of the correct side of the hut
      const position = new Point(hut.position.x + 10 * Math.sin(hut.rotation), hut.position.y + 10 * Math.cos(hut.rotation));
      
      if (hut.type === EntityType.workerHut) {
         createTribeWorker(position, hut.rotation, this.id, hut.id);
      } else {
         createTribeWarrior(position, hut.rotation, this, hut.id);
      }
   }

   // @Cleanup
   
   public registerNewTribeMember(tribesmanID: number): void {
      // this.friendlyTribesmenIDs.push(tribeMember.id);
      this.tribesmanIDs.push(tribesmanID);
   }

   public registerTribeMemberDeath(tribesmanID: number): void {
      const idx = this.tribesmanIDs.indexOf(tribesmanID);
      if (idx !== -1) {
         this.tribesmanIDs.splice(idx, 1);
      } else {
         console.warn("Tribesman was not in tribe");
      }
   }

   public getNumHuts(): number {
      return this.huts.length;
   }

   /** Destroys the tribe and all its associated buildings */
   // @Incomplete
   private destroy(): void {
      // Remove huts
      for (const hut of this.huts) {
         hut.destroy();
      }

      Board.removeTribe(this);
   }

   private createTribeAreaAroundBuilding(buildingPosition: Point, influence: number): void {
      const minTileX = clampToBoardDimensions(Math.floor((buildingPosition.x - influence) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((buildingPosition.x + influence) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((buildingPosition.y - influence) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((buildingPosition.y + influence) / Settings.TILE_SIZE));

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            this.addTileToArea(tileX, tileY);
         }
      }
   }

   private removeBuildingFromTiles(buildingPosition: Point, influence: number): void {
      const minTileX = clampToBoardDimensions(Math.floor((buildingPosition.x - influence) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((buildingPosition.x + influence) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((buildingPosition.y - influence) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((buildingPosition.y + influence) / Settings.TILE_SIZE));

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            this.removeTileFromArea(tileX, tileY);
         }
      }
   }

   private removeTileFromArea(tileX: number, tileY: number): void {
      const tileIndex = tileY * Settings.BOARD_DIMENSIONS + tileX;
      
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
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      if (!this.chunkArea.hasOwnProperty(chunkIndex)) {
         return;
      } else {
         this.chunkArea[chunkIndex].numInfluences--;
         if (this.chunkArea[chunkIndex].numInfluences === 0) {
            delete this.chunkArea[chunkIndex];
         }
      }
   }

   private addTileToArea(tileX: number, tileY: number): void {
      const tileIndex = tileY * Settings.BOARD_DIMENSIONS + tileX;
      
      if (!this.area.hasOwnProperty(tileIndex)) {
         // If the tile isn't in the area, create a new record
         const tile = Board.getTile(tileX, tileY);
         this.area[tileIndex] = {
            tile: tile,
            numInfluences: 1
         };
      } else {
         this.area[tileIndex].numInfluences++;
      }

      const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
      const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      if (!this.chunkArea.hasOwnProperty(chunkIndex)) {
         const chunk = Board.getChunk(chunkX, chunkY);
         this.chunkArea[chunkIndex] = {
            chunk: chunk,
            numInfluences: 1
         };
      } else {
         this.chunkArea[chunkIndex].numInfluences++;
      }
   }

   public tileIsInArea(tileX: number, tileY: number): boolean {
      const tileIndex = tileY * Settings.BOARD_DIMENSIONS + tileX;
      return this.area.hasOwnProperty(tileIndex);
   }

   public numTiles(): number {
      return Object.keys(this.area).length;
   }

   public hasBarrel(barrel: Entity): boolean {
      return this.barrels.includes(barrel);
   }

   public getArea(): Array<Tile> {
      const area = new Array<Tile>();
      for (const tileInfluence of Object.values(this.area)) {
         area.push(tileInfluence.tile);
      }
      return area;
   }

   public techIsComplete(tech: TechInfo): boolean {
      if (this.techTreeUnlockProgress[tech.id] === undefined) {
         return false;
      }
      
      // Check item requirements
      for (const [itemTypeString, itemAmountRequired] of Object.entries(tech.researchItemRequirements)) {
         const itemType = Number(itemTypeString) as ItemType;
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

   public studyTech(tech: TechInfo, researcherX: number, researcherY: number, studyAmount: number): void {
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

   public hasUnlockedTech(techID: TechID): boolean {
      return this.unlockedTechs.indexOf(techID) !== -1;
   }

   public forceUnlockTech(techID: TechID): void {
      const techInfo = getTechByID(techID);
      if (this.hasUnlockedTech(techID) || techInfo.blacklistedTribes.includes(this.type)) {
         return;
      }

      if (!this.techTreeUnlockProgress.hasOwnProperty(techInfo.id)) {
         this.techTreeUnlockProgress[techInfo.id] = {
            itemProgress: {},
            studyProgress: 0
         }
      }
      this.techTreeUnlockProgress[techInfo.id]!.studyProgress = techInfo.researchStudyRequirements;
      for (const [itemTypeString, itemAmount] of Object.entries(techInfo.researchItemRequirements)) {
         const itemType = Number(itemTypeString) as ItemType;
         this.techTreeUnlockProgress[techInfo.id]!.itemProgress[itemType] = itemAmount;
      }
      
      this.unlockTech(techInfo.id);
   }

   public unlockAllTechs(): void {
      for (const techInfo of TECHS) {
         this.forceUnlockTech(techInfo.id);
      }
   }

   public techRequiresResearching(tech: TechInfo): boolean {
      if (!this.techTreeUnlockProgress.hasOwnProperty(tech.id)) {
         return true;
      }

      const studyProgress = this.techTreeUnlockProgress[tech.id]!.studyProgress;
      return studyProgress < tech.researchStudyRequirements;
   }

   public updateAvailableResources(): void {
      const newAvailableResources: Partial<Record<ItemType, number>> = {};
      
      for (let i = 0; i < this.barrels.length; i++) {
         const barrel = this.barrels[i];

         const inventoryComponent = InventoryComponentArray.getComponent(barrel.id);
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

   public getItemsRequiredForTech(tech: TechInfo): ReadonlyArray<ItemType> {
      const requiredItemType = new Array<ItemType>();
      
      for (const [itemTypeString, itemAmountRequired] of Object.entries(tech.researchItemRequirements)) {
         const itemType = Number(itemTypeString) as ItemType;
         if (typeof this.techTreeUnlockProgress[tech.id] === "undefined" || this.techTreeUnlockProgress[tech.id]!.itemProgress[itemType]! < itemAmountRequired) {
            requiredItemType.push(itemType);
         }
      }

      return requiredItemType;
   }

   public useItemInTechResearch(tech: TechInfo, itemType: ItemType, amount: number): number {
      if (tech.researchItemRequirements[itemType] === undefined) {
         return 0;
      }
      
      let amountUsed = 0;

      if (this.techTreeUnlockProgress[tech.id] === undefined) {
         amountUsed = Math.min(amount, tech.researchItemRequirements[itemType]!);
         this.techTreeUnlockProgress[tech.id] = {
            itemProgress: { [itemType]: amountUsed },
            studyProgress: 0
         };
      } else if (this.techTreeUnlockProgress[tech.id]!.itemProgress[itemType] === undefined) {
         amountUsed = Math.min(amount, tech.researchItemRequirements[itemType]!);
         this.techTreeUnlockProgress[tech.id]!.itemProgress[itemType] = amountUsed;
      } else {
         amountUsed = Math.min(amount, tech.researchItemRequirements[itemType]! - this.techTreeUnlockProgress[tech.id]!.itemProgress[itemType]!);
         this.techTreeUnlockProgress[tech.id]!.itemProgress[itemType]! += amountUsed;
      }

      return amountUsed;
   }
}

export default Tribe;