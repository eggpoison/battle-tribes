import { PotentialBuildingPlanData } from "battletribes-shared/ai-building-types";
import { circleAndRectangleDoIntersect, rectanglesAreColliding } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StructureType, calculateStructureConnectionInfo } from "battletribes-shared/structures";
import { Point, getAngleDiff, randFloat } from "battletribes-shared/utils";
import Layer from "../Layer";
import Tribe, { BuildingPlan, NewBuildingPlan, BuildingPlanType, VirtualBuilding } from "../Tribe";
import { placeBuilding } from "../entities/tribes/tribe-member";
import { SafetyNode, addHitboxesOccupiedNodes, addRectangularSafetyNodePositions, placeVirtualBuilding, updateTribeBuildingInfo } from "./ai-building";
import { buildingIsInfrastructure, getTribeSafety, tribeIsVulnerable } from "./ai-building-heuristics";
import { TribeArea, areaHasOutsideDoor, getOutsideDoorPlacePlan } from "./ai-building-areas";
import { getItemRecipe } from "battletribes-shared/items/crafting-recipes";
import { ItemType, ITEM_INFO_RECORD, PlaceableItemInfo } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../components/TransformComponent";
import { createEntityHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { boxIsCircular, updateBox } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { getBoxesCollidingEntities } from "battletribes-shared/hitbox-collision";
import { LayerType, surfaceLayer } from "../world";

const virtualBuildingTakesUpWallSpace = (wallPosition: Point, wallRotation: number, virtualBuilding: VirtualBuilding, wallHitbox: RectangularBox): boolean => {
   // @Speed: cache when virutal entity is first created
   const hitboxes = createEntityHitboxes(virtualBuilding.entityType);
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      const box = hitbox.box;
      updateBox(box, virtualBuilding.position.x, virtualBuilding.position.y, virtualBuilding.rotation);
      
      // @Cleanup: copy and paste
      if (boxIsCircular(box)) {
         if (circleAndRectangleDoIntersect(box.position, box.radius, wallPosition, Settings.TILE_SIZE, Settings.TILE_SIZE, wallRotation)) {
            return true;
         }
      } else {
         const collisionData = rectanglesAreColliding(wallHitbox, box);
         if (collisionData.isColliding) {
            return true;
         }
      }
   }

   return false;
}

const wallSpaceIsFree = (layer: Layer, wallPosition: Point, wallRotation: number, tribe: Tribe): boolean => {
   // @Cleanup
   // @Speed: Can do a constant smaller than tile size
   // const minChunkX = Math.max(Math.floor((x - Settings.TILE_SIZE) / Settings.CHUNK_UNITS), 0);
   // const maxChunkX = Math.min(Math.floor((x + Settings.TILE_SIZE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   // const minChunkY = Math.max(Math.floor((y - Settings.TILE_SIZE) / Settings.CHUNK_UNITS), 0);
   // const maxChunkY = Math.min(Math.floor((y + Settings.TILE_SIZE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const tempWallBox = new RectangularBox(new Point(0, 0), Settings.TILE_SIZE * 0.499, Settings.TILE_SIZE * 0.499, wallRotation); 
   tempWallBox.position.x = wallPosition.x;
   tempWallBox.position.y = wallPosition.y;
   
   // Check for existing walls
   // @Speed!!
   for (let i = 0; i < tribe.virtualBuildings.length; i++) {
      const virtualBuilding = tribe.virtualBuildings[i];

      if (virtualBuildingTakesUpWallSpace(wallPosition, wallRotation, virtualBuilding, tempWallBox)) {
         return false;
      }
   }

   // @Temporary
   // for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
   //    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
   //       const chunk = Board.getChunk(chunkX, chunkY);

   //       for (let i = 0; i < chunk.entities.length; i++) {
   //          const entity = chunk.entities[i];
   //          if (tribe.buildings.indexOf(entity) === -1) {
   //             continue;
   //          }
      
   //          if (entityCollidesWithWall(x, y, wallRotation, entity, wallVertexOffsets)) {
   //             return false;
   //          }
   //       }
   //    }
   // }

   // Check for restricted areas
   for (let i = 0; i < tribe.restrictedBuildingAreas.length; i++) {
      const restrictedArea = tribe.restrictedBuildingAreas[i];

      const collisionData = rectanglesAreColliding(tempWallBox, restrictedArea.hitbox.box);
      if (collisionData.isColliding) {
         return false;
      }
   }

   // @Speed: Can do a constant smaller than tile size
   // Check for wall tiles
   const minTileX = Math.max(Math.floor((wallPosition.x - Settings.TILE_SIZE) / Settings.TILE_SIZE), 0);
   const maxTileX = Math.min(Math.floor((wallPosition.x + Settings.TILE_SIZE) / Settings.TILE_SIZE), Settings.TILES_IN_WORLD_WIDTH - 1);
   const minTileY = Math.max(Math.floor((wallPosition.y - Settings.TILE_SIZE) / Settings.TILE_SIZE), 0);
   const maxTileY = Math.min(Math.floor((wallPosition.y + Settings.TILE_SIZE) / Settings.TILE_SIZE), Settings.TILES_IN_WORLD_WIDTH - 1);
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const isWall = layer.tileXYIsWall(tileX, tileY);
         if (!isWall) {
            continue;
         }
         
         // @Speed
         
         const tileXUnits = (tileX + 0.5) * Settings.TILE_SIZE;
         const tileYUnits = (tileY + 0.5) * Settings.TILE_SIZE;

         const tempTileBox = new RectangularBox(new Point(tileXUnits, tileYUnits), Settings.TILE_SIZE * 0.499, Settings.TILE_SIZE * 0.499, 0);
         updateBox(tempTileBox, tileXUnits, tileYUnits, 0);

         const collisionData = rectanglesAreColliding(tempWallBox, tempTileBox);
         if (collisionData.isColliding) {
            return false;
         }
      }
   }

   return true;
}

interface TribeInfo {
   readonly safetyNodes: Set<SafetyNode>;
   readonly safetyRecord: Record<SafetyNode, number>;
   readonly occupiedSafetyNodes: Set<SafetyNode>;
   readonly virtualBuildings: Array<VirtualBuilding>;
   readonly virtualBuildingRecord: Record<number, VirtualBuilding>;
   readonly areas: Array<TribeArea>;
   // @Incomplete
   // readonly nodeToAreaIDRecord: Record<SafetyNodeIndex, number>;
}

const copyTribeInfo = (tribe: Tribe): TribeInfo => {
   // @Hack
   const buildingInfo = tribe.layerBuildingInfoRecord[LayerType.surface];
   
   const safetyRecord: Record<SafetyNode, number> = {};
   const nodes = Object.keys(buildingInfo.safetyRecord).map(nodeString => Number(nodeString)) as Array<SafetyNode>;
   for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      const safety = buildingInfo.safetyRecord[node];
      safetyRecord[node] = safety;
   }

   const virtualBuildingRecord: Record<number, VirtualBuilding> = {};
   const virtualBuildingIDs = Object.keys(tribe.virtualBuildingRecord).map(idString => Number(idString));
   for (let i = 0; i < virtualBuildingIDs.length; i++) {
      const id = virtualBuildingIDs[i];

      const virtualBuilding = tribe.virtualBuildingRecord[id];
      virtualBuildingRecord[id] = virtualBuilding;
   }

   return {
      safetyNodes: new Set(buildingInfo.safetyNodes),
      safetyRecord: safetyRecord,
      occupiedSafetyNodes: new Set(buildingInfo.occupiedSafetyNodes),
      virtualBuildings: tribe.virtualBuildings.slice(),
      virtualBuildingRecord: virtualBuildingRecord,
      areas: tribe.areas.slice()
   };
}

interface WallPlaceCandidate {
   readonly position: Point;
   readonly rotation: number;
}

const wallCandidateAlreadyExists = (candidateX: number, candidateY: number, candidateRotation: number, placeCandidates: ReadonlyArray<WallPlaceCandidate>): boolean => {
   for (let i = 0; i < placeCandidates.length; i++) {
      const currentCandidate = placeCandidates[i];

      const diffX = candidateX - currentCandidate.position.x;
      const diffY = candidateY - currentCandidate.position.y;
      const diffRotation = getAngleDiff(candidateRotation, currentCandidate.rotation);
      if (Math.abs(diffX) < 0.1 && Math.abs(diffY) < 0.1 && Math.abs(diffRotation) < 0.0001) {
         return true;
      }
   }

   return false;
}

const addGridAlignedWallCandidates = (tribe: Tribe, placeCandidates: Array<WallPlaceCandidate>): void => {
   const occupiedNodes = new Set<SafetyNode>();
   for (let i = 0; i < tribe.virtualBuildings.length; i++) {
      const virtualBuilding = tribe.virtualBuildings[i];
      if (buildingIsInfrastructure(virtualBuilding.entityType)) {
         for (const node of virtualBuilding.occupiedNodes) {
            occupiedNodes.add(node);
         }
      }

   }
   for (let i = 0; i < tribe.restrictedBuildingAreas.length; i++) {
      const restrictedArea = tribe.restrictedBuildingAreas[i];

      const minX = restrictedArea.hitbox.box.calculateBoundsMinX();
      const maxX = restrictedArea.hitbox.box.calculateBoundsMaxX();
      const minY = restrictedArea.hitbox.box.calculateBoundsMinY();
      const maxY = restrictedArea.hitbox.box.calculateBoundsMaxY();
      
      addRectangularSafetyNodePositions(restrictedArea.position, restrictedArea.width, restrictedArea.height, restrictedArea.rotation, minX, maxX, minY, maxY, occupiedNodes);
   }

   // Convert to occupied tile indexes
   const occupiedTileIndexes = new Set<number>();
   for (const node of occupiedNodes) {
      const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
      const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

      const tileX = Math.floor(nodeX * Settings.SAFETY_NODE_SEPARATION / Settings.TILE_SIZE);
      const tileY = Math.floor(nodeY * Settings.SAFETY_NODE_SEPARATION / Settings.TILE_SIZE);

      const tileIndex = tileY * Settings.TILES_IN_WORLD_WIDTH + tileX;
      occupiedTileIndexes.add(tileIndex);
   }

   // Find border tiles
   const borderTileIndexes = new Set<number>();
   for (const tileIndex of occupiedTileIndexes) {
      const tileX = tileIndex % Settings.TILES_IN_WORLD_WIDTH;
      const tileY = Math.floor(tileIndex / Settings.TILES_IN_WORLD_WIDTH);

      // Top
      if (tileY < Settings.TILES_IN_WORLD_WIDTH - 1) {
         const tileIndex = (tileY + 1) * Settings.TILES_IN_WORLD_WIDTH + tileX;
         if (!occupiedTileIndexes.has(tileIndex)) {
            borderTileIndexes.add(tileIndex);
         }
      }

      // Right
      if (tileX < Settings.TILES_IN_WORLD_WIDTH - 1) {
         const tileIndex = tileY * Settings.TILES_IN_WORLD_WIDTH + tileX + 1;
         if (!occupiedTileIndexes.has(tileIndex)) {
            borderTileIndexes.add(tileIndex);
         }
      }

      // Bottom
      if (tileY > 0) {
         const tileIndex = (tileY - 1) * Settings.TILES_IN_WORLD_WIDTH + tileX;
         if (!occupiedTileIndexes.has(tileIndex)) {
            borderTileIndexes.add(tileIndex);
         }
      }

      // Left
      if (tileX > 0) {
         const tileIndex = tileY * Settings.TILES_IN_WORLD_WIDTH + tileX - 1;
         if (!occupiedTileIndexes.has(tileIndex)) {
            borderTileIndexes.add(tileIndex);
         }
      }
   }

   for (const tileIndex of borderTileIndexes) {
      occupiedTileIndexes.add(tileIndex);
   }

   // Expand tile indexes
   // @Speed
   let previousOuterTileIndexes = borderTileIndexes;
   for (let i = 0; i < 1; i++) {
      const addedTileIndexes = new Set<SafetyNode>();
      
      for (const tileIndex of previousOuterTileIndexes) {
         const tileX = tileIndex % Settings.TILES_IN_WORLD_WIDTH;
         const tileY = Math.floor(tileIndex / Settings.TILES_IN_WORLD_WIDTH);

         // Top
         if (tileY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const tileIndex = (tileY + 1) * Settings.TILES_IN_WORLD_WIDTH + tileX;
            if (!occupiedTileIndexes.has(tileIndex)) {
               occupiedTileIndexes.add(tileIndex);
               addedTileIndexes.add(tileIndex);
            }
         }
   
         // Right
         if (tileX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const tileIndex = tileY * Settings.TILES_IN_WORLD_WIDTH + tileX + 1;
            if (!occupiedTileIndexes.has(tileIndex)) {
               occupiedTileIndexes.add(tileIndex);
               addedTileIndexes.add(tileIndex);
            }
         }
   
         // Bottom
         if (tileY > 0) {
            const tileIndex = (tileY - 1) * Settings.TILES_IN_WORLD_WIDTH + tileX;
            if (!occupiedTileIndexes.has(tileIndex)) {
               occupiedTileIndexes.add(tileIndex);
               addedTileIndexes.add(tileIndex);
            }
         }
   
         // Left
         if (tileX > 0) {
            const tileIndex = tileY * Settings.TILES_IN_WORLD_WIDTH + tileX - 1;
            if (!occupiedTileIndexes.has(tileIndex)) {
               occupiedTileIndexes.add(tileIndex);
               addedTileIndexes.add(tileIndex);
            }
         }
      }

      previousOuterTileIndexes = addedTileIndexes;
   }

   // Filter candidates
   for (const tileIndex of occupiedTileIndexes) {
      const tileX = tileIndex % Settings.TILES_IN_WORLD_WIDTH;
      const tileY = Math.floor(tileIndex / Settings.TILES_IN_WORLD_WIDTH);

      const x = (tileX + 0.5) * Settings.TILE_SIZE;
      const y = (tileY + 0.5) * Settings.TILE_SIZE;
      const wallPos = new Point(x, y);
      
      // @Hack: surfacelayer
      if (wallSpaceIsFree(surfaceLayer, wallPos, 0, tribe) && !wallCandidateAlreadyExists(x, y, 0, placeCandidates)) {
         placeCandidates.push({
            position: new Point(x, y),
            rotation: 0
         });
      }
   }
}

const addSnappedWallCandidates = (tribe: Tribe, placeCandidates: Array<WallPlaceCandidate>): void => {
   for (let i = 0; i < tribe.virtualBuildings.length; i++) {
      const virtualBuilding = tribe.virtualBuildings[i];
      if (virtualBuilding.entityType !== EntityType.wall) {
         continue;
      }
      
      for (let i = 0; i < 4; i++) {
         const offsetDirection = virtualBuilding.rotation + i * Math.PI / 2;
         const x = virtualBuilding.position.x + 64 * Math.sin(offsetDirection);
         const y = virtualBuilding.position.y + 64 * Math.cos(offsetDirection);
         const wallPosition = new Point(x, y);

         // @Hack: surfacelayer
         if (wallSpaceIsFree(surfaceLayer, wallPosition, virtualBuilding.rotation, tribe) && !wallCandidateAlreadyExists(x, y, virtualBuilding.rotation, placeCandidates)) {
            placeCandidates.push({
               position: new Point(x, y),
               rotation: virtualBuilding.rotation
            });
         }
      }
   }
}

const getWallPlaceCandidates = (tribe: Tribe): ReadonlyArray<WallPlaceCandidate> => {
   const placeCandidates = new Array<WallPlaceCandidate>();

   addGridAlignedWallCandidates(tribe, placeCandidates);
   addSnappedWallCandidates(tribe, placeCandidates);
   
   return placeCandidates;
}

const findIdealWallPlacePosition = (tribe: Tribe): NewBuildingPlan | null => {
   const potentialCandidates = getWallPlaceCandidates(tribe);
   if (potentialCandidates.length === 0) {
      // Unable to find a position
      return null
   }

   let realTribeInfo = copyTribeInfo(tribe);

   const potentialPlans = new Array<PotentialBuildingPlanData>();
   
   // 
   // Simulate placing each position to see which one increases safety the most
   // 

   let maxSafety = -1;
   let bestCandidate!: WallPlaceCandidate;
   for (let i = 0; i < potentialCandidates.length; i++) {
      const candidate = potentialCandidates[i];

      // Simulate placing the wall
      placeVirtualBuilding(tribe, candidate.position, candidate.rotation, EntityType.wall, tribe.virtualEntityIDCounter);
      tribe.virtualEntityIDCounter++;
      
      updateTribeBuildingInfo(LayerType.surface, tribe);
      updateTribeBuildingInfo(LayerType.underground, tribe);

      const query = getTribeSafety(tribe);
      const safety = query.safety;

      if (safety > maxSafety) {
         maxSafety = safety;
         bestCandidate = candidate;
      }

      potentialPlans.push({
         x: candidate.position.x,
         y: candidate.position.y,
         rotation: candidate.rotation,
         buildingType: EntityType.wall,
         safety: safety,
         safetyData: query.safetyInfo
      });

      // @Hack
      const buildingInfo = tribe.layerBuildingInfoRecord[LayerType.surface];

      // @Incomplete: doesn't reset everything
      // Reset back to real info
      buildingInfo.safetyNodes = realTribeInfo.safetyNodes;
      buildingInfo.safetyRecord = realTribeInfo.safetyRecord;
      buildingInfo.occupiedSafetyNodes = realTribeInfo.occupiedSafetyNodes;
      tribe.virtualBuildings = realTribeInfo.virtualBuildings;
      tribe.virtualBuildingRecord = realTribeInfo.virtualBuildingRecord;
      tribe.areas = realTribeInfo.areas;

      // Re-copy the tribe info so that it doesn't get modified across iterations
      realTribeInfo = copyTribeInfo(tribe);
   }
   
   return {
      type: BuildingPlanType.newBuilding,
      position: bestCandidate.position,
      rotation: bestCandidate.rotation,
      buildingRecipe: getItemRecipe(ItemType.wooden_wall)!,
      assignedTribesmanID: 0,
      potentialPlans: potentialPlans
   };
}

const tribeHasWorkbench = (tribe: Tribe): boolean => {
   for (let i = 0; i < tribe.virtualBuildings.length; i++) {
      const virtualBuilding = tribe.virtualBuildings[i];
      if (virtualBuilding.entityType === EntityType.workbench) {
         return true;
      }
   }
   return false;
}

const buildingPositionIsValid = (tribe: Tribe, layer: Layer, x: number, y: number, rotation: number, entityType: StructureType): boolean => {
   const hitboxes = createEntityHitboxes(entityType);
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      updateBox(hitbox.box, x, y, rotation);
   }
   
   const collidingEntities = getBoxesCollidingEntities(layer.getWorldInfo(), hitboxes);
   
   for (let i = 0; i < collidingEntities.length; i++) {
      const collidingEntity = collidingEntities[i];

      if (tribe.buildings.indexOf(collidingEntity) !== -1) {
         return false;
      }
   }

   return true;
}

// @Cleanup: name. not just position, also transform
interface BuildingPosition {
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
}

export function generateBuildingPosition(tribe: Tribe, layerType: LayerType, entityType: StructureType): BuildingPosition {
   const buildingInfo = tribe.layerBuildingInfoRecord[layerType];
   
   // Find min and max node positions
   let minNodeX = Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1;
   let maxNodeX = 0;
   let minNodeY = Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1;
   let maxNodeY = 0;
   for (const node of buildingInfo.occupiedSafetyNodes) {
      const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
      const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

      if (nodeX < minNodeX) {
         minNodeX = nodeX;
      }
      if (nodeX > maxNodeX) {
         maxNodeX = nodeX;
      }
      if (nodeY < minNodeY) {
         minNodeY = nodeY;
      }
      if (nodeY > maxNodeY) {
         maxNodeY = nodeY;
      }
   }

   const minX = minNodeX * Settings.SAFETY_NODE_SEPARATION - 150;
   const maxX = (maxNodeX + 1) * Settings.SAFETY_NODE_SEPARATION + 150;
   const minY = minNodeY * Settings.SAFETY_NODE_SEPARATION - 150;
   const maxY = (maxNodeY + 1) * Settings.SAFETY_NODE_SEPARATION + 150;

   let attempts = 0;
   main:
   while (attempts++ < 999) {
      const x = randFloat(minX, maxX);
      const y = randFloat(minY, maxY);
      const rotation = 2 * Math.PI * Math.random();
      
      const hitboxes = createEntityHitboxes(entityType);
      for (let i = 0; i < hitboxes.length; i++) {
         const hitbox = hitboxes[i];
         const box = hitbox.box;

         updateBox(box, x, y, rotation);
         
         // Make sure the hitboxes don't go outside the world
         const minX = box.calculateBoundsMinX();
         const maxX = box.calculateBoundsMaxX();
         const minY = box.calculateBoundsMinY();
         const maxY = box.calculateBoundsMaxY();
         if (minX < 0 || maxX >= Settings.BOARD_UNITS || minY < 0 || maxY >= Settings.BOARD_UNITS) {
            continue main;
         }
      }
   
      const occupiedNodes = new Set<SafetyNode>();
      addHitboxesOccupiedNodes(hitboxes, occupiedNodes);
   
      // Make sure that the building is in at least one safe node
      let isValid = false;
      for (const node of occupiedNodes) {
         if (buildingInfo.safetyNodes.has(node)) {
            isValid = true;
            break;
         }
      }
      if (!isValid) {
         continue;
      }

      // @Hack: surfacelayer
      if (!buildingPositionIsValid(tribe, surfaceLayer, x, y, rotation, entityType)) {
         continue;
      }
      
      return {
         x: x,
         y: y,
         rotation: rotation
      };
   }

   throw new Error();
}

const getNumDesiredBarrels = (tribe: Tribe): number => {
   // Want a barrel every 20 buildings
   return Math.floor(tribe.virtualBuildings.length / 20);
}
const getNumBarrels = (tribe: Tribe): number => {
   let num = 0;
   for (let i = 0; i < tribe.virtualBuildings.length; i++) {
      const virtualBuilding = tribe.virtualBuildings[i];
      if (virtualBuilding.entityType === EntityType.barrel) {
         num++;
      }
   }
   return num;
}

const generatePlan = (tribe: Tribe): BuildingPlan | null => {
   // @Temporary: remove once personal plans account for this
   // If the tribe doesn't have a workbench, prioritise placing one
   if (!tribeHasWorkbench(tribe)) {
      // @Hack: surfacelayer
      const position = generateBuildingPosition(tribe, LayerType.surface, EntityType.workbench);

      const plan: NewBuildingPlan = {
         type: BuildingPlanType.newBuilding,
         position: new Point(position.x, position.y),
         rotation: position.rotation,
         buildingRecipe: getItemRecipe(ItemType.workbench)!,
         assignedTribesmanID: 0,
         potentialPlans: []
      };
      return plan;
   }

   // If there are areas without doors outside, add them
   for (let i = 0; i < tribe.areas.length; i++) {
      const area = tribe.areas[i];

      if (!areaHasOutsideDoor(area)) {
         const plan = getOutsideDoorPlacePlan(tribe, area);
         if (plan !== null) {
            return plan;
         }
      }
   }

   const numDesiredBarrels = getNumDesiredBarrels(tribe);
   if (getNumBarrels(tribe) < numDesiredBarrels) {
      // @Hack: surfacelayer
      const position = generateBuildingPosition(tribe, LayerType.surface, EntityType.barrel);

      const plan: NewBuildingPlan = {
         type: BuildingPlanType.newBuilding,
         position: new Point(position.x, position.y),
         rotation: position.rotation,
         buildingRecipe: getItemRecipe(ItemType.barrel)!,
         assignedTribesmanID: 0,
         potentialPlans: []
      };
      return plan;
   }

   // Protect buildings if vulnerable
   if (tribeIsVulnerable(tribe)) {
      // Find the place for a wall that would maximise the building's safety
      const plan = findIdealWallPlacePosition(tribe);
      if (plan !== null) {
         return plan;
      }
   }

   return null;
}

export function updateTribePlans(tribe: Tribe): void {
   // @Temporary
   if(1+1===2)return;
   
   // @Cleanup: messy

   tribe.buildingPlans = [];

   // If the tribe has no huts, place one
   if (tribe.hasTotem() && tribe.getNumHuts() === 0) {
      // @Hack: surfacelayer
      const position = generateBuildingPosition(tribe, LayerType.surface, EntityType.workbench);

      const plan: NewBuildingPlan = {
         type: BuildingPlanType.newBuilding,
         position: new Point(position.x, position.y),
         rotation: position.rotation,
         buildingRecipe: getItemRecipe(ItemType.worker_hut)!,
         assignedTribesmanID: 0,
         potentialPlans: []
      };
      tribe.buildingPlans.push(plan);
      return;
   }

   const addedVirtualBuildings = new Array<VirtualBuilding>();
   
   const numHuts = tribe.getNumHuts();
   for (let i = 0; i < numHuts; i++) {
      const plan = generatePlan(tribe);
      if (plan === null) {
         break;
      }

      tribe.buildingPlans.push(plan);

      const virtualEntityID = tribe.virtualEntityIDCounter++;
      let virtualBuilding: VirtualBuilding;
      switch (plan.type) {
         case BuildingPlanType.newBuilding: {
            const entityType = (ITEM_INFO_RECORD[plan.buildingRecipe.product] as PlaceableItemInfo).entityType;
            virtualBuilding = placeVirtualBuilding(tribe, plan.position, plan.rotation, entityType as StructureType, virtualEntityID);
            break;
         }
         case BuildingPlanType.upgrade: {
            // @Bug: Get from virtual buildings not actual entities
            const baseBuildingTransformComponent = TransformComponentArray.getComponent(plan.baseBuildingID);
            virtualBuilding = placeVirtualBuilding(tribe, baseBuildingTransformComponent.position, plan.rotation, plan.entityType, virtualEntityID);
            break;
         }
      }
      addedVirtualBuildings.push(virtualBuilding);
   }

   for (let i = 0; i < addedVirtualBuildings.length; i++) {
      const virtualBuilding = addedVirtualBuildings[i];
      tribe.removeVirtualBuilding(virtualBuilding.id);
   }
}

export function forceBuildPlans(tribe: Tribe): void {
   for (let i = 0; i < tribe.buildingPlans.length; i++) {
      const plan = tribe.buildingPlans[i];

      switch (plan.type) {
         case BuildingPlanType.newBuilding: {
            const entityType = (ITEM_INFO_RECORD[plan.buildingRecipe.product] as PlaceableItemInfo).entityType;
            // @Hack: surfacelayer
            const connectionInfo = calculateStructureConnectionInfo(plan.position, plan.rotation, entityType, surfaceLayer.getWorldInfo());

            // @Hack
            placeBuilding(tribe, surfaceLayer, plan.position, plan.rotation, entityType, connectionInfo);
            break;
         }
      }
   }
}