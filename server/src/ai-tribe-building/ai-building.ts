import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StructureType } from "webgl-test-shared/dist/structures";
import { Point, distBetweenPointAndRectangle } from "webgl-test-shared/dist/utils";
import Tribe, { RestrictedBuildingArea, VirtualBuilding, getNumWallConnections, updateTribeWalls } from "../Tribe";
import Board from "../Board";
import { TribeArea, createTribeArea, updateTribeAreaDoors } from "./ai-building-areas";
import { updateTribePlans } from "./ai-building-plans";
import { assertHitboxIsRectangular, BoxType, createHitbox, hitboxIsCircular, HitboxWrapper, updateBox } from "webgl-test-shared/dist/boxes/boxes";
import RectangularBox from "webgl-test-shared/dist/boxes/RectangularBox";
import { HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { createEntityHitboxes } from "webgl-test-shared/dist/boxes/entity-hitbox-creation";

const enum Vars {
   /** How much safety increases when moving in a node */
   DISTANCE_FALLOFF = 1.5,
   OCCUPIED_NODE_SAFETY = 10,
   BORDER_PADDING = 5,
   PLAN_COMPLETE_RANGE = 10
}

export type SafetyNode = number;

// @Incomplete: investigate only adding an entity's safety once. (so that it doesn't vary between placements as much)
// @Cleanup: don't hardcode these. Instead just do it based on the entity's health.

const BUILDING_SAFETY: Record<StructureType, number> = {
   [EntityType.wall]: 10,
   [EntityType.tribeTotem]: 10,
   [EntityType.workerHut]: 10,
   [EntityType.warriorHut]: 10,
   [EntityType.barrel]: 10,
   [EntityType.door]: 30, // A bit weaker than a wall (30 vs 10 * 4 = 40)
   [EntityType.embrasure]: 10,
   [EntityType.tunnel]: 10,
   [EntityType.slingTurret]: 10,
   [EntityType.ballista]: 10,
   [EntityType.floorSpikes]: 10,
   [EntityType.wallSpikes]: 10,
   [EntityType.floorPunjiSticks]: 10,
   [EntityType.wallPunjiSticks]: 10,
   [EntityType.workbench]: 10,
   [EntityType.researchBench]: 10,
   [EntityType.healingTotem]: 10,
   [EntityType.planterBox]: 10,
   [EntityType.fence]: 5,
   [EntityType.fenceGate]: 5,
   [EntityType.campfire]: 10,
   [EntityType.furnace]: 10,
   [EntityType.frostshaper]: 10,
   [EntityType.stonecarvingTable]: 10
};

export function createRestrictedBuildingArea(position: Point, width: number, height: number, rotation: number, associatedBuildingID: number): RestrictedBuildingArea {
   const box = new RectangularBox(new Point(0, 0), width, height, rotation);
   const hitbox = createHitbox<BoxType.rectangular>(box, 0, 0, HitboxCollisionBit.DEFAULT, 0, 0);
   box.position.x = position.x;
   box.position.y = position.y;
   
   return {
      position: position,
      width: width,
      height: height,
      rotation: rotation,
      associatedBuildingID: associatedBuildingID,
      hitbox: hitbox
   };
}

export function getSafetyNode(nodeX: number, nodeY: number): SafetyNode {
   return nodeY * Settings.SAFETY_NODES_IN_WORLD_WIDTH + nodeX;
}

const addCircularHitboxNodePositions = (hitbox: HitboxWrapper<BoxType.circular>, positions: Set<SafetyNode>): void => {
   const box = hitbox.box;
   
   const minX = box.calculateBoundsMinX();
   const maxX = box.calculateBoundsMaxX();
   const minY = box.calculateBoundsMinY();
   const maxY = box.calculateBoundsMaxY();

   const centerX = box.position.x / Settings.SAFETY_NODE_SEPARATION;
   const centerY = box.position.y / Settings.SAFETY_NODE_SEPARATION;
   
   const minNodeX = Math.max(Math.floor(minX / Settings.SAFETY_NODE_SEPARATION), 0);
   const maxNodeX = Math.min(Math.ceil(maxX / Settings.SAFETY_NODE_SEPARATION), Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1);
   const minNodeY = Math.max(Math.floor(minY / Settings.SAFETY_NODE_SEPARATION), 0);
   const maxNodeY = Math.min(Math.ceil(maxY / Settings.SAFETY_NODE_SEPARATION), Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1);

   const hitboxNodeRadius = box.radius / Settings.SAFETY_NODE_SEPARATION + 0.5;
   const hitboxNodeRadiusSquared = hitboxNodeRadius * hitboxNodeRadius;

   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const xDiff = nodeX - centerX;
         const yDiff = nodeY - centerY;
         if (xDiff * xDiff + yDiff * yDiff <= hitboxNodeRadiusSquared) {
            const node = getSafetyNode(nodeX, nodeY);
            positions.add(node);
         }
      }
   }
}

// @Cleanup: Make this take a hitbox as params instead of all this shit
export function addRectangularSafetyNodePositions(rectPosition: Point, rectWidth: number, rectHeight: number, rectRotation: number, rectMinX: number, rectMaxX: number, rectMinY: number, rectMaxY: number, positions: Set<SafetyNode>): void {
   // @Speed: Math.round might also work
   const minNodeX = Math.max(Math.floor(rectMinX / Settings.SAFETY_NODE_SEPARATION), 0);
   const maxNodeX = Math.min(Math.ceil(rectMaxX / Settings.SAFETY_NODE_SEPARATION), Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1);
   const minNodeY = Math.max(Math.floor(rectMinY / Settings.SAFETY_NODE_SEPARATION), 0);
   const maxNodeY = Math.min(Math.floor(rectMaxY / Settings.SAFETY_NODE_SEPARATION), Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1);

   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const x = nodeX * Settings.SAFETY_NODE_SEPARATION;
         const y = nodeY * Settings.SAFETY_NODE_SEPARATION;
         if (distBetweenPointAndRectangle(new Point(x, y), rectPosition, rectWidth, rectHeight, rectRotation) <= Settings.SAFETY_NODE_SEPARATION * 0.5) {
            const node = getSafetyNode(nodeX, nodeY);
            positions.add(node);
         }
      }
   }
}

export function addHitboxesOccupiedNodes(hitboxes: ReadonlyArray<HitboxWrapper>, positions: Set<SafetyNode>): void {
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];

      // Add to occupied pathfinding nodes
      if (hitboxIsCircular(hitbox)) {
         addCircularHitboxNodePositions(hitbox, positions);
      } else {
         // @Hack
         assertHitboxIsRectangular(hitbox);
         
         const box = hitbox.box;
         addRectangularSafetyNodePositions(box.position, box.width, box.height, box.rotation, box.calculateBoundsMinX(), box.calculateBoundsMaxX(), box.calculateBoundsMinY(), box.calculateBoundsMaxY(), positions);
      }
   }
}

const updateTribeOccupiedNodesInfo = (tribe: Tribe): void => {
   const occupiedNodes = new Set<SafetyNode>();
   const occupiedNodeToEntityIDRecord: Record<SafetyNode, Array<number>> = {};

   // Add nodes from buildings
   for (let i = 0; i < tribe.virtualBuildings.length; i++) {
      const virtualBuilding = tribe.virtualBuildings[i];
      for (const node of virtualBuilding.occupiedNodes) {
         occupiedNodes.add(node);

         if (occupiedNodeToEntityIDRecord[node] === undefined) {
            occupiedNodeToEntityIDRecord[node] = [virtualBuilding.id];
         } else {
            occupiedNodeToEntityIDRecord[node].push(virtualBuilding.id);
         }
      }
   }

   tribe.occupiedSafetyNodes = occupiedNodes;
   tribe.occupiedNodeToEntityIDRecord = occupiedNodeToEntityIDRecord;
}

/** Gets all nodes within the tribe's bounding area which aren't occupied */
const getAreaNodes = (occupiedNodes: Set<SafetyNode>, minNodeX: number, maxNodeX: number, minNodeY: number, maxNodeY: number): Set<SafetyNode> => {
   const area = new Set<SafetyNode>();
   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const node = getSafetyNode(nodeX, nodeY);
         if (!occupiedNodes.has(node)) {
            area.add(node);
         }
      }
   }
   return area;
}

const calculateNodeSafety = (tribe: Tribe, minAdjacentSafety: number, node: number): number => {
   let safety = minAdjacentSafety + Vars.DISTANCE_FALLOFF;
   if (tribe.occupiedSafetyNodes.has(node)) {
      let maxOccupiedSafety = 0;
      
      const buildingIDs = tribe.occupiedNodeToEntityIDRecord[node];
      for (let i = 0; i < buildingIDs.length; i++) {
         const buildingID = buildingIDs[i];
         const virtualBuilding = tribe.virtualBuildingRecord[buildingID];
   
         let occupiedSafety = BUILDING_SAFETY[virtualBuilding.entityType];
   
         // Walls are safer the more connected they are
         if (virtualBuilding.entityType === EntityType.wall) {
            const wallInfo = tribe.wallInfoRecord[buildingID];
            const numConnections = getNumWallConnections(wallInfo.connectionBitset);
            occupiedSafety *= 1 + numConnections / 7;
         }

         if (occupiedSafety > maxOccupiedSafety) {
            maxOccupiedSafety = occupiedSafety;
         }
      }

      safety += maxOccupiedSafety;
   }

   return safety;
}

const createAreaInfo = (tribe: Tribe, areas: Array<TribeArea>, nodeToAreaIDRecord: Record<SafetyNode, number>, insideNodes: Set<SafetyNode>): void => {
   const occupiedNodes = tribe.occupiedSafetyNodes;
   
   // Find min and max node positions
   let minNodeX = Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1;
   let maxNodeX = 0;
   let minNodeY = Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1;
   let maxNodeY = 0;
   for (const node of occupiedNodes) {
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
   const minBorderNodeX = Math.max(minNodeX - 1, 0);
   const maxBorderNodeX = Math.min(maxNodeX + 1, Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1);
   const minBorderNodeY = Math.max(minNodeY - 1, 0);
   const maxBorderNodeY = Math.min(maxNodeY + 1, Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1);

   // @Cleanup: name
   const areaNodes = getAreaNodes(occupiedNodes, minNodeX, maxNodeX, minNodeY, maxNodeY);
   let areaIDCounter = 0;
   while (areaNodes.size > 0) {
      // Start at the first element in the set
      let originNode!: SafetyNode;
      for (const node of areaNodes) {
         originNode = node;
         break;
      }

      let isInside = true;
      const encounteredOccupiedNodes = new Set<SafetyNode>();

      // @Speed: Span filling
      // Get all connected nodes
      const connectedNodes = new Set<SafetyNode>();
      const nodesToCheck = [originNode];
      while (nodesToCheck.length > 0) {
         const node = nodesToCheck[0];
         const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
         const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

         connectedNodes.add(node);
         nodesToCheck.shift();

         areaNodes.delete(node);

         // @Speed: If outside, immediately break and do the above on the remaining nodes

         // Top
         if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const node = getSafetyNode(nodeX, nodeY + 1);
            if (!occupiedNodes.has(node) && !connectedNodes.has(node) && nodesToCheck.indexOf(node) === -1) {
               if (nodeY + 1 === maxBorderNodeY) {
                  isInside = false;
               } else {
                  nodesToCheck.push(node);
               }
            }
            if (occupiedNodes.has(node)) {
               encounteredOccupiedNodes.add(node);
            }
         }

         // Right
         if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const node = getSafetyNode(nodeX + 1, nodeY);
            if (!occupiedNodes.has(node) && !connectedNodes.has(node) && nodesToCheck.indexOf(node) === -1) {
               if (nodeX + 1 === maxBorderNodeX) {
                  isInside = false;
               } else {
                  nodesToCheck.push(node);
               }
            }
            if (occupiedNodes.has(node)) {
               encounteredOccupiedNodes.add(node);
            }
         }

         // Bottom
         if (nodeY > 0) {
            const node = getSafetyNode(nodeX, nodeY - 1);
            if (!occupiedNodes.has(node) && !connectedNodes.has(node) && nodesToCheck.indexOf(node) === -1) {
               if (nodeY - 1 === minBorderNodeY) {
                  isInside = false;
               } else {
                  nodesToCheck.push(node);
               }
            }
            if (occupiedNodes.has(node)) {
               encounteredOccupiedNodes.add(node);
            }
         }

         // Left
         if (nodeX > 0) {
            const node = getSafetyNode(nodeX - 1, nodeY);
            if (!occupiedNodes.has(node) && !connectedNodes.has(node) && nodesToCheck.indexOf(node) === -1) {
               if (nodeX - 1 === minBorderNodeX) {
                  isInside = false;
               } else {
                  nodesToCheck.push(node);
               }
            }
            if (occupiedNodes.has(node)) {
               encounteredOccupiedNodes.add(node);
            }
         }
      }

      if (isInside) {
         for (const node of connectedNodes) {
            insideNodes.add(node);
            nodeToAreaIDRecord[node] = areaIDCounter;
         }

         // Create area
         const area = createTribeArea(tribe, connectedNodes, areaIDCounter, encounteredOccupiedNodes);
         areas.push(area);

         areaIDCounter++;
      }
   }
}

const getBorderNodes = (tribe: Tribe, insideNodes: ReadonlySet<SafetyNode>): Set<SafetyNode> => {
   const occupiedNodes = tribe.occupiedSafetyNodes;

   const borderNodes = new Set<SafetyNode>();
   for (const node of occupiedNodes) {
      const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
      const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

      // Top
      if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const node = getSafetyNode(nodeX, nodeY + 1);
         if (!occupiedNodes.has(node) && !insideNodes.has(node) && !safetyNodeIsInWall(nodeX, nodeY + 1)) {
            borderNodes.add(node);
         }
      }

      // Right
      if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const node = getSafetyNode(nodeX + 1, nodeY);
         if (!occupiedNodes.has(node) && !insideNodes.has(node) && !safetyNodeIsInWall(nodeX + 1, nodeY)) {
            borderNodes.add(node);
         }
      }

      // Bottom
      if (nodeY > 0) {
         const node = getSafetyNode(nodeX, nodeY - 1);
         if (!occupiedNodes.has(node) && !insideNodes.has(node) && !safetyNodeIsInWall(nodeX, nodeY - 1)) {
            borderNodes.add(node);
         }
      }

      // Left
      if (nodeX > 0) {
         const node = getSafetyNode(nodeX - 1, nodeY);
         if (!occupiedNodes.has(node) && !insideNodes.has(node) && !safetyNodeIsInWall(nodeX - 1, nodeY)) {
            borderNodes.add(node);
         }
      }
   }

   return borderNodes;
}

export function safetyNodeIsInWall(nodeX: number, nodeY: number): boolean {
   const tileX = Math.floor(nodeX * Settings.SAFETY_NODE_SEPARATION / Settings.TILE_SIZE);
   const tileY = Math.floor(nodeY * Settings.SAFETY_NODE_SEPARATION / Settings.TILE_SIZE);
   return Board.getTileIsWall(tileX, tileY);
}

const createPaddingNodes = (tribe: Tribe, outmostPaddingNodes: Set<SafetyNode>, borderNodes: ReadonlySet<SafetyNode>, paddingNodes: Set<SafetyNode>): void => {
   const occupiedNodes = tribe.occupiedSafetyNodes;

   let previousOuterNodes = borderNodes;
   for (let i = 0; i < Vars.BORDER_PADDING; i++) {
      // 
      // Expand previous outer nodes
      // 

      const addedNodes = new Set<SafetyNode>();
      
      for (const node of previousOuterNodes) {
         const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
         const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

         // Top
         if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const node = getSafetyNode(nodeX, nodeY + 1);
            if (!occupiedNodes.has(node) && !paddingNodes.has(node) && !safetyNodeIsInWall(nodeX, nodeY + 1)) {
               paddingNodes.add(node);
               addedNodes.add(node);
            }
         }
   
         // Right
         if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const node = getSafetyNode(nodeX + 1, nodeY);
            if (!occupiedNodes.has(node) && !paddingNodes.has(node) && !safetyNodeIsInWall(nodeX + 1, nodeY)) {
               paddingNodes.add(node);
               addedNodes.add(node);
            }
         }
   
         // Bottom
         if (nodeY > 0) {
            const node = getSafetyNode(nodeX, nodeY - 1);
            if (!occupiedNodes.has(node) && !paddingNodes.has(node) && !safetyNodeIsInWall(nodeX, nodeY - 1)) {
               paddingNodes.add(node);
               addedNodes.add(node);
            }
         }
   
         // Left
         if (nodeX > 0) {
            const node = getSafetyNode(nodeX - 1, nodeY);
            if (!occupiedNodes.has(node) && !paddingNodes.has(node) && !safetyNodeIsInWall(nodeX - 1, nodeY)) {
               paddingNodes.add(node);
               addedNodes.add(node);
            }
         }
      }

      previousOuterNodes = addedNodes;
      if (i === Vars.BORDER_PADDING - 1) {
         for (const node of addedNodes) {
            const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
            const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);
            if ((nodeX === 0 || !safetyNodeIsInWall(nodeX - 1, nodeY)) ||
                (nodeX === Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1 || !safetyNodeIsInWall(nodeX + 1, nodeY)) ||
                (nodeY === 0 || !safetyNodeIsInWall(nodeX, nodeY - 1)) ||
                (nodeY === Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1 || !safetyNodeIsInWall(nodeX, nodeY + 1))) {
               outmostPaddingNodes.add(node);
            }
         }
      }
   }
}

const insertNode = (surroundingNodes: Array<SafetyNode>, node: SafetyNode, safetyRecord: Record<SafetyNode, number>, nextMinSafetyIdx: number): void => {
   const nodeSafety = safetyRecord[node];
   
   let low = nextMinSafetyIdx;
   let high = surroundingNodes.length - 1;
   while (low < high) {
      const mid = (low + high) >> 1;
      const midNode = surroundingNodes[mid];

      if (safetyRecord[midNode] < nodeSafety) {
         low = mid + 1;
      } else {
         high = mid;
      }
   }

   // @Cleanup
   
   // // binary search ends, we need to insert the element around here       
   if (nodeSafety < safetyRecord[surroundingNodes[low]]) surroundingNodes.splice(low, 0, node);
   else if (nodeSafety > safetyRecord[surroundingNodes[high]]) surroundingNodes.splice(high+1, 0, node);
   else surroundingNodes.splice(high, 0, node);
   
   // if (low === surroundingNodes.length - 1) {
   //    surroundingNodes.push(node);
   // } else {
   //    surroundingNodes.splice(low, 0, node);

   // }
   // let insertIdx = low;
   // for (let i = low; i < surroundingNodes.length; i++) {
      
   // }
}

const combineAllNodes = (occupiedNodes: ReadonlySet<SafetyNode>, paddingNodes: ReadonlySet<SafetyNode>, insideNodes: ReadonlySet<SafetyNode>, outmostPaddingNodes: ReadonlySet<SafetyNode>): Set<SafetyNode> => {
   const nodes = new Set<SafetyNode>;

   // Add all nodes
   for (const node of occupiedNodes) {
      nodes.add(node);
   }
   for (const node of paddingNodes) {
      if (!outmostPaddingNodes.has(node)) {
         nodes.add(node);
      }
   }
   for (const node of insideNodes) {
      nodes.add(node);
   }

   return nodes;
}

const createSafetyRecord = (tribe: Tribe, outmostPaddingNodes: ReadonlySet<SafetyNode>, paddingNodes: ReadonlySet<SafetyNode>, insideNodes: ReadonlySet<SafetyNode>): Record<SafetyNode, number> => {
   const occupiedNodes = tribe.occupiedSafetyNodes;

   const safetyRecord: Record<SafetyNode, number> = {};
   
   // Calculate contained nodes' safety
   const surroundingNodes = new Array<SafetyNode>();
   for (const node of outmostPaddingNodes) {
      // Initialise with 0 safety
      safetyRecord[node] = 0;
      
      // Can just push as the safety are all 0
      surroundingNodes.push(node);
   }

   // All the nodes whose safetys are yet to be calculated
   const remainingNodes = combineAllNodes(occupiedNodes, paddingNodes, insideNodes, outmostPaddingNodes);

   let nextMinSafetyIdx = 0;
   
   while (remainingNodes.size > 0) {
      const currentNode = surroundingNodes[nextMinSafetyIdx];
      const minSafety = safetyRecord[currentNode];
      nextMinSafetyIdx++;

      const nodeX = currentNode % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
      const nodeY = (currentNode / Settings.SAFETY_NODES_IN_WORLD_WIDTH) | 0;
      
      // @Speed: These bounds checks are unfortunate

      // Top
      if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const node = getSafetyNode(nodeX, nodeY + 1);
         if (remainingNodes.has(node)) {
            safetyRecord[node] = calculateNodeSafety(tribe, minSafety, node);
            insertNode(surroundingNodes, node, safetyRecord, nextMinSafetyIdx);
            remainingNodes.delete(node);
         }
      }

      // Right
      if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const node = getSafetyNode(nodeX + 1, nodeY);
         if (remainingNodes.has(node)) {
            safetyRecord[node] = calculateNodeSafety(tribe, minSafety, node);
            insertNode(surroundingNodes, node, safetyRecord, nextMinSafetyIdx);
            remainingNodes.delete(node);
         }
      }

      // Bottom
      if (nodeY > 0) {
         const node = getSafetyNode(nodeX, nodeY - 1);
         if (remainingNodes.has(node)) {
            safetyRecord[node] = calculateNodeSafety(tribe, minSafety, node);
            insertNode(surroundingNodes, node, safetyRecord, nextMinSafetyIdx);
            remainingNodes.delete(node);
         }
      }

      // Left
      if (nodeX > 0) {
         const node = getSafetyNode(nodeX - 1, nodeY);
         if (remainingNodes.has(node)) {
            safetyRecord[node] = calculateNodeSafety(tribe, minSafety, node);
            insertNode(surroundingNodes, node, safetyRecord, nextMinSafetyIdx);
            remainingNodes.delete(node);
         }
      }
   }

   return safetyRecord;
}

/** Updates a whole bunch of stuff. Relies on the occupied nodes being correct. */
export function updateTribeBuildingInfo(tribe: Tribe): void {
   updateTribeOccupiedNodesInfo(tribe);
   
   // Find inside nodes and contained buildings
   const areas = new Array<TribeArea>();
   const nodeToAreaIDRecord: Record<SafetyNode, number> = {};
   const insideNodes = new Set<SafetyNode>();
   createAreaInfo(tribe, areas, nodeToAreaIDRecord, insideNodes);

   // Find border nodes
   const borderNodes = getBorderNodes(tribe, insideNodes);

   // Create padding nodes
   const outmostPaddingNodes = new Set<SafetyNode>()
   const paddingNodes = new Set(borderNodes);
   createPaddingNodes(tribe, outmostPaddingNodes, borderNodes, paddingNodes);
   
   const safetyRecord = createSafetyRecord(tribe, outmostPaddingNodes, paddingNodes, insideNodes);

   const nodes = new Set<SafetyNode>();
   for (const node of tribe.occupiedSafetyNodes) {
      nodes.add(node);
   }
   for (const node of paddingNodes) {
      nodes.add(node);
   }
   for (const node of insideNodes) {
      nodes.add(node);
   }
   
   tribe.safetyNodes = nodes;
   tribe.safetyRecord = safetyRecord;
   tribe.areas = areas;
   tribe.nodeToAreaIDRecord = nodeToAreaIDRecord;

   // @Cleanup: kinda weird to be doing it here
   updateTribeAreaDoors(tribe);
   updateTribeWalls(tribe);
}

export function tickTribes(): void {
   for (let i = 0; i < Board.tribes.length; i++) {
      const tribe = Board.tribes[i];
      
      // Update safety nodes
      if (tribe.buildingsAreDirty && tribe.isAIControlled) {
         updateTribeBuildingInfo(tribe);
         updateTribePlans(tribe);

         tribe.buildingsAreDirty = false;
      }

      if (Board.ticks % Settings.TPS === 0) {
         // @Cleanup: Not related to tribe building
         tribe.updateAvailableResources();
      }
   }
}

export function placeVirtualBuilding(tribe: Tribe, position: Readonly<Point>, rotation: number, entityType: StructureType, virtualEntityID: number): VirtualBuilding {
   const hitboxes = createEntityHitboxes(entityType);
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      updateBox(hitbox.box, position.x, position.y, rotation);
   }
   
   const occupiedNodes = new Set<SafetyNode>();
   addHitboxesOccupiedNodes(hitboxes, occupiedNodes);
   
   const virtualBuilding: VirtualBuilding = {
      id: virtualEntityID,
      position: position,
      rotation: rotation,
      occupiedNodes: occupiedNodes,
      entityType: entityType
   };
   tribe.addVirtualBuilding(virtualBuilding);
   return virtualBuilding;
}