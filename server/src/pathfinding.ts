import { PathfindingNodeIndex, VisibleChunkBounds } from "battletribes-shared/client-server-types";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { PathfindingSettings, Settings } from "battletribes-shared/settings";
import { distBetweenPointAndRectangle, angle, calculateDistanceSquared, Point, distBetweenPointAndRectangularBox } from "battletribes-shared/utils";
import PathfindingHeap from "./PathfindingHeap";
import OPTIONS from "./options";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { TribeComponentArray } from "./components/TribeComponent";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { ProjectileComponentArray } from "./components/ProjectileComponent";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { boxIsCircular, HitboxCollisionType, Hitbox } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { getEntityType, getGameTicks } from "./world";

const enum Vars {
   NODE_ACCESSIBILITY_RESOLUTION = 3,
   WALL_TILE_OCCUPIED_ID = 3427823
}

const activeGroupIDs = new Array<number>();

let dirtyPathfindingEntities = new Array<EntityID>();

export function addDirtyPathfindingEntity(entity: EntityID): void {
   dirtyPathfindingEntities.push(entity);
}

export function removeDirtyPathfindingEntity(entity: EntityID): void {
   for (let i = 0 ; i < dirtyPathfindingEntities.length; i++) {
      const currentEntity = dirtyPathfindingEntities[i];
      if (currentEntity === entity) {
         dirtyPathfindingEntities.splice(i, 1);
         break;
      }
   }
}

export function getPathfindingGroupID(): number {
   let lastNum = 0;
   for (let i = 0; i < activeGroupIDs.length; i++) {
      const groupID = activeGroupIDs[i];
      // If a group was skipped, return that group
      if (groupID > lastNum + 1) {
         return lastNum + 1;
      }
      lastNum = groupID;
   }

   // None were skipped
   return activeGroupIDs.length + 1;
}

const nodeGroupIDs = new Array<Array<number>>();

for (let i = 0; i < PathfindingSettings.NODES_IN_WORLD_WIDTH * PathfindingSettings.NODES_IN_WORLD_WIDTH; i++) {
   const groupIDs = new Array<number>();
   nodeGroupIDs.push(groupIDs);
}

const markPathfindingNodeOccupance = (node: PathfindingNodeIndex, groupID: number): void => {
   nodeGroupIDs[node].push(groupID);
}

const markPathfindingNodeClearance = (node: PathfindingNodeIndex, groupID: number): void => {
   const groupIDs = nodeGroupIDs[node];
   for (let i = 0; i < groupIDs.length; i++) {
      const currentGroupID = groupIDs[i];
      if (currentGroupID === groupID) {
         groupIDs.splice(i, 1);
         return;
      }
   }
}

const footprintNodeOffsets = new Array<Array<number>>();

const getNode = (nodeX: number, nodeY: number): number => {
   return (nodeY + 1) * PathfindingSettings.NODES_IN_WORLD_WIDTH + nodeX + 1;
}

// 
// Mark borders as inaccessible
// 

// Bottom border
for (let nodeX = 0; nodeX < PathfindingSettings.NODES_IN_WORLD_WIDTH - 2; nodeX++) {
   const node = getNode(nodeX, -1);
   markPathfindingNodeOccupance(node, Vars.WALL_TILE_OCCUPIED_ID);
}
// Top border
for (let nodeX = 0; nodeX < PathfindingSettings.NODES_IN_WORLD_WIDTH - 2; nodeX++) {
   const node = getNode(nodeX, PathfindingSettings.NODES_IN_WORLD_WIDTH - 2);
   markPathfindingNodeOccupance(node, Vars.WALL_TILE_OCCUPIED_ID);
}
// Left border
for (let nodeY = -1; nodeY < PathfindingSettings.NODES_IN_WORLD_WIDTH - 1; nodeY++) {
   const node = getNode(-1, nodeY);
   markPathfindingNodeOccupance(node, Vars.WALL_TILE_OCCUPIED_ID);
}
// Right border
for (let nodeY = -1; nodeY < PathfindingSettings.NODES_IN_WORLD_WIDTH - 1; nodeY++) {
   const node = getNode(PathfindingSettings.NODES_IN_WORLD_WIDTH - 2, nodeY);
   markPathfindingNodeOccupance(node, Vars.WALL_TILE_OCCUPIED_ID);
}

// Calculate footprint node offsets
const MAX_FOOTPRINT = 3;
for (let footprint = 1; footprint <= MAX_FOOTPRINT; footprint++) {
   const footprintSquared = footprint * footprint;
   
   const offsets = new Array<number>();
   for (let offsetX = -footprint; offsetX <= footprint; offsetX++) {
      for (let offsetY = -footprint; offsetY <= footprint; offsetY++) {
         if (offsetX * offsetX + offsetY * offsetY > footprintSquared) {
            continue;
         }

         const offset = offsetY * PathfindingSettings.NODES_IN_WORLD_WIDTH + offsetX;
         offsets.push(offset);
      }
   }

   footprintNodeOffsets.push(offsets);
}

const nodeIsOccupied = (node: PathfindingNodeIndex, ignoredGroupID: number): boolean => {
   const groupIDs = nodeGroupIDs[node];
   for (let i = 0; i < groupIDs.length; i++) {
      const currentGroupID = groupIDs[i];
      if (currentGroupID !== ignoredGroupID) {
         return true;
      }
   }
   return false;
}

const slowAccessibilityCheck = (node: PathfindingNodeIndex, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean => {
   const originNodeX = node % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
   const originNodeY = Math.floor(node / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1;

   const hitboxNodeRadiusSquared = pathfindingEntityFootprint * pathfindingEntityFootprint;

   for (let i = 0; i < Vars.NODE_ACCESSIBILITY_RESOLUTION * Vars.NODE_ACCESSIBILITY_RESOLUTION; i++) {
      const nodeXOffset = (i % Vars.NODE_ACCESSIBILITY_RESOLUTION + 1) / (Vars.NODE_ACCESSIBILITY_RESOLUTION + 1) - 0.5;
      const nodeYOffset = (Math.floor(i / Vars.NODE_ACCESSIBILITY_RESOLUTION) + 1) / (Vars.NODE_ACCESSIBILITY_RESOLUTION + 1) - 0.5;

      const centerX = originNodeX + nodeXOffset;
      const centerY = originNodeY + nodeYOffset;

      let minNodeX = Math.round(centerX - pathfindingEntityFootprint);
      let maxNodeX = Math.round(centerX + pathfindingEntityFootprint);
      let minNodeY = Math.round(centerY - pathfindingEntityFootprint);
      let maxNodeY = Math.round(centerY + pathfindingEntityFootprint);
      if (minNodeX < -1) {
         minNodeX = -1;
      }
      if (maxNodeX >= PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) {
         maxNodeX = PathfindingSettings.NODES_IN_WORLD_WIDTH - 2;
      }
      if (minNodeY < -1) {
         minNodeY = -1;
      }
      if (maxNodeY >= PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) {
         maxNodeY = PathfindingSettings.NODES_IN_WORLD_WIDTH - 2;
      }
   
      let isAccessible = true;
      outer:
      for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
         for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
            const xDiff = nodeX - centerX;
            const yDiff = nodeY - centerY;
            if (xDiff * xDiff + yDiff * yDiff <= hitboxNodeRadiusSquared) {
               const node = getNode(Math.round(nodeX), Math.round(nodeY));

               if (nodeIsOccupied(node, ignoredGroupID)) {
                  isAccessible = false;
                  break outer;
               }
            }
         }
      }
      if (isAccessible) {
         return true;
      }
   }

   return false;
}

// @Temporary
// const fastAccessibilityCheck = (node: PathfindingNodeIndex, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean => {
//       // // @Incomplete: Prevent wrap-around on the edges
//    const nodeOffsets = footprintNodeOffsets[Math.floor(pathfindingEntityFootprint) - 1];
//    for (let i = 0; i < nodeOffsets.length; i++) {
//       const currentNode = node + nodeOffsets[i];
//       const x = (currentNode % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1);
//       const y = (Math.floor(currentNode / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1);

//       if (nodeIsOccupied(currentNode, ignoredGroupID)) {
//          return false;
//       }
//    }

//    return true;
// }

// @Temporary: a parameter
const nodeIsAccessibleForEntity = (node: PathfindingNodeIndex, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean => {
   // @Temporary: fast doesn't seem to work properly?
   // return fastAccessibilityCheck(node, ignoredGroupID, pathfindingEntityFootprint, a) || slowAccessibilityCheck(node, ignoredGroupID, pathfindingEntityFootprint, a);
   return slowAccessibilityCheck(node, ignoredGroupID, pathfindingEntityFootprint);
}

const addCircularHitboxOccupiedNodes = (occupiedPathfindingNodes: Set<PathfindingNodeIndex>, pathfindingGroupID: number, hitbox: Hitbox): void => {
   const box = hitbox.box as CircularBox;
   
   const minX = box.calculateBoundsMinX();
   const maxX = box.calculateBoundsMaxX();
   const minY = box.calculateBoundsMinY();
   const maxY = box.calculateBoundsMaxY();

   const centerX = box.position.x / PathfindingSettings.NODE_SEPARATION;
   const centerY = box.position.y / PathfindingSettings.NODE_SEPARATION;
   
   let minNodeX = Math.floor(minX / PathfindingSettings.NODE_SEPARATION);
   let maxNodeX = Math.ceil(maxX / PathfindingSettings.NODE_SEPARATION);
   let minNodeY = Math.floor(minY / PathfindingSettings.NODE_SEPARATION);
   let maxNodeY = Math.ceil(maxY / PathfindingSettings.NODE_SEPARATION);
   if (minNodeX < -1) {
      minNodeX = -1;
   }
   if (maxNodeX >= PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) {
      maxNodeX = PathfindingSettings.NODES_IN_WORLD_WIDTH - 2;
   }
   if (minNodeY < -1) {
      minNodeY = -1;
   }
   if (maxNodeY >= PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) {
      maxNodeY = PathfindingSettings.NODES_IN_WORLD_WIDTH - 2;
   }

   // @Incomplete: Also take up more if it's ice spikes
   // Make soft hitboxes take up less node radius so that it easier to pathfind around them
   const radiusOffset = hitbox.collisionType === HitboxCollisionType.hard ? 0.5 : 0;
   const hitboxNodeRadius = box.radius / PathfindingSettings.NODE_SEPARATION + radiusOffset;
   const hitboxNodeRadiusSquared = hitboxNodeRadius * hitboxNodeRadius;

   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const xDiff = nodeX - centerX;
         const yDiff = nodeY - centerY;
         if (xDiff * xDiff + yDiff * yDiff <= hitboxNodeRadiusSquared) {
            const node = getNode(nodeX, nodeY);
            // Add
            if (!occupiedPathfindingNodes.has(node)) {
               markPathfindingNodeOccupance(node, pathfindingGroupID);
               occupiedPathfindingNodes.add(node);
            }
         }
      }
   }
}

const addRectangularHitboxOccupiedNodes = (occupiedPathfindingNodes: Set<PathfindingNodeIndex>, pathfindingGroupID: number, hitbox: Hitbox): void => {
   const box = hitbox.box as RectangularBox;
   
   const minX = box.calculateBoundsMinX();
   const maxX = box.calculateBoundsMaxX();
   const minY = box.calculateBoundsMinY();
   const maxY = box.calculateBoundsMaxY();

   // @Speed: Math.round might also work
   let minNodeX = Math.floor(minX / PathfindingSettings.NODE_SEPARATION);
   let maxNodeX = Math.ceil(maxX / PathfindingSettings.NODE_SEPARATION);
   let minNodeY = Math.floor(minY / PathfindingSettings.NODE_SEPARATION);
   let maxNodeY = Math.ceil(maxY / PathfindingSettings.NODE_SEPARATION);
   if (minNodeX < -1) {
      minNodeX = -1;
   }
   if (maxNodeX >= PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) {
      maxNodeX = PathfindingSettings.NODES_IN_WORLD_WIDTH - 2;
   }
   if (minNodeY < -1) {
      minNodeY = -1;
   }
   if (maxNodeY >= PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) {
      maxNodeY = PathfindingSettings.NODES_IN_WORLD_WIDTH - 2;
   }

   // Make soft hitboxes take up less node radius so that it easier to pathfind around them
   // @Cleanup @Temporary
   const nodeClearance = hitbox.collisionType === HitboxCollisionType.hard ? PathfindingSettings.NODE_SEPARATION * 0.5 : 0;
   // const nodeClearance = hitbox.collisionType === HitboxCollisionType.hard ? PathfindingSettings.NODE_SEPARATION * 1 : PathfindingSettings.NODE_SEPARATION * 0.5;

   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const x = nodeX * PathfindingSettings.NODE_SEPARATION;
         const y = nodeY * PathfindingSettings.NODE_SEPARATION;
         
         if (distBetweenPointAndRectangularBox(x, y, box) <= nodeClearance) {
            const node = getNode(nodeX, nodeY);
            // @Temporary
            if (node >= PathfindingSettings.NODES_IN_WORLD_WIDTH*PathfindingSettings.NODES_IN_WORLD_WIDTH) {
               throw new Error();
            }

            // Add
            if (!occupiedPathfindingNodes.has(node)) {
               markPathfindingNodeOccupance(node, pathfindingGroupID);
               occupiedPathfindingNodes.add(node);
            }
         }
      }
   }
}

const addHitboxOccupiedNodes = (occupiedPathfindingNodes: Set<PathfindingNodeIndex>, pathfindingGroupID: number, hitbox: Hitbox): void => {
   if (boxIsCircular(hitbox.box)) {
      addCircularHitboxOccupiedNodes(occupiedPathfindingNodes, pathfindingGroupID, hitbox);
   } else {
      addRectangularHitboxOccupiedNodes(occupiedPathfindingNodes, pathfindingGroupID, hitbox);
   }
}

export function replacePathfindingNodeGroupID(node: PathfindingNodeIndex, oldGroupID: number, newGroupID: number): void {
   const groupIDs = nodeGroupIDs[node];
   for (let i = 0; i < groupIDs.length; i++) {
      const currentGroupID = groupIDs[i];
      if (currentGroupID === oldGroupID) {
         groupIDs[i] = newGroupID;
         return;
      }
   }
   // @Temporary
   // throw new Error();
}

export function markWallTileInPathfinding(tileX: number, tileY: number): void {
   const x = tileX * Settings.TILE_SIZE;
   const y = tileY * Settings.TILE_SIZE;

   const minNodeX = Math.ceil(x / PathfindingSettings.NODE_SEPARATION);
   const minNodeY = Math.floor(y / PathfindingSettings.NODE_SEPARATION);
   const maxNodeX = Math.ceil((x + Settings.TILE_SIZE) / PathfindingSettings.NODE_SEPARATION);
   const maxNodeY = Math.floor((y + Settings.TILE_SIZE) / PathfindingSettings.NODE_SEPARATION);

   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const node = getNode(nodeX, nodeY);
         markPathfindingNodeOccupance(node, Vars.WALL_TILE_OCCUPIED_ID);
      }
   }
}

export function getClosestPathfindNode(x: number, y: number): PathfindingNodeIndex {
   const nodeX = Math.round(x / PathfindingSettings.NODE_SEPARATION);
   const nodeY = Math.round(y / PathfindingSettings.NODE_SEPARATION);
   return getNode(nodeX, nodeY);
}

export function positionIsAccessible(x: number, y: number, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean {
   const node = getClosestPathfindNode(x, y);
   return nodeIsAccessibleForEntity(node, ignoredGroupID, pathfindingEntityFootprint);
}

export function getAngleToNode(transformComponent: TransformComponent, node: PathfindingNodeIndex): number {
   const x = (node % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
   const y = (Math.floor(node / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;
   return angle(x - transformComponent.position.x, y - transformComponent.position.y);
}

export function getDistanceToNode(transformComponent: TransformComponent, node: PathfindingNodeIndex): number {
   const x = (node % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
   const y = (Math.floor(node / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;

   const diffX = transformComponent.position.x - x;
   const diffY = transformComponent.position.y - y;
   return Math.sqrt(diffX * diffX + diffY * diffY);
}

export function getDistFromNode(transformComponent: TransformComponent, node: PathfindingNodeIndex): number {
   const x = (node % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
   const y = (Math.floor(node / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;

   return Math.sqrt(Math.pow(x - transformComponent.position.x, 2) + Math.pow(y - transformComponent.position.y, 2));
}

export function getDistBetweenNodes(node1: PathfindingNodeIndex, node2: PathfindingNodeIndex): number {
   const x1 = node1 % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
   const y1 = Math.floor(node1 / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1;

   const x2 = node2 % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
   const y2 = Math.floor(node2 / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1;

   const diffX = x1 - x2;
   const diffY = y1 - y2;
   return Math.sqrt(diffX * diffX + diffY * diffY);
}

export function entityHasReachedNode(transformComponent: TransformComponent, node: PathfindingNodeIndex): boolean {
   const x = (node % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
   const y = (Math.floor(node / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;

   const distSquared = calculateDistanceSquared(transformComponent.position.x, transformComponent.position.y, x, y);
   return distSquared <= PathfindingSettings.NODE_REACH_DIST * PathfindingSettings.NODE_SEPARATION;
}

const aStarHeuristic = (startNode: PathfindingNodeIndex, endNode: PathfindingNodeIndex): number => {
   const startNodeX = startNode % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
   const startNodeY = ((startNode / PathfindingSettings.NODES_IN_WORLD_WIDTH) | 0) - 1;
   const endNodeX = endNode % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
   const endNodeY = ((endNode / PathfindingSettings.NODES_IN_WORLD_WIDTH) | 0) - 1;

   const diffX = startNodeX - endNodeX;
   const diffY = startNodeY - endNodeY;
   return Math.sqrt(diffX * diffX + diffY * diffY);
}

export const enum PathfindFailureDefault {
   /** Returns an empty path */
   returnEmpty,
   /** Returns the path to the node which was closest to the goal */
   returnClosest,
   throwError
}

export interface PathfindOptions {
   readonly goalRadius: number;
   readonly failureDefault: PathfindFailureDefault;
}

export function getEntityFootprint(radius: number): number {
   // @Incomplete
   // @Hack: Add 1 to account for the fact that a node's occupance can mean that the hitbox overlaps anywhere in the 3x3 grid of nodes around that node
   
   return radius / PathfindingSettings.NODE_SEPARATION;
}

export function pathIsClear(startX: number, startY: number, endX: number, endY: number, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean {
   const start = getClosestPathfindNode(startX, startY);
   const goal = getClosestPathfindNode(endX, endY);

   return pathBetweenNodesIsClear(start, goal, ignoredGroupID, pathfindingEntityFootprint);
}

/**
 * A-star pathfinding algorithm
 * @param startX 
* @param startY 
 * @param endX 
 * @param endY 
 * @param ignoredEntityIDs 
 * @param pathfindingEntityFootprint Radius of the entity's footprint in nodes
 * @param options 
 * @returns 
 */
export function pathfind(startX: number, startY: number, endX: number, endY: number, ignoredGroupID: number, pathfindingEntityFootprint: number, options: PathfindOptions): Array<PathfindingNodeIndex> {
   const start = getClosestPathfindNode(startX, startY);
   const goal = getClosestPathfindNode(endX, endY);

   if (options.goalRadius === 0 && !nodeIsAccessibleForEntity(goal, ignoredGroupID, pathfindingEntityFootprint)) {
      // @Temporary
      // If we don't stop this from occuring in the first place. Ideally should throw an error, this will cause a massive slowdown
      console.trace();
      console.warn("Goal is inaccessible! @ " + endX + " " + endY);
      // throw new Error();
      return [];
   }

   const cameFrom: Record<PathfindingNodeIndex, number> = {};
   
   const gScore: Record<PathfindingNodeIndex, number> = {};
   gScore[start] = 0;

   const fScore: Record<PathfindingNodeIndex, number> = {};
   fScore[start] = aStarHeuristic(start, goal);

   const openSet = new PathfindingHeap(); // @Speed
   openSet.gScore = gScore;
   openSet.fScore = fScore;
   openSet.addNode(start);

   const closedSet = new Set<PathfindingNodeIndex>();

   // @Speed: attempt prioritising the neighbour closest to direction
   
   let i = 0;
   while (openSet.currentItemCount > 0) {
      // @Temporary
      if (++i >= 500) {
      // if (++i >= 10000) {
         // @Temporary
         // console.warn("!!! POTENTIAL UNRESOLVEABLE PATH !!!");
         // console.log("goal @ " + endX + " " + endY);
         // console.trace();
         break;
      }

      // @Cleanup: name
      const current = openSet.removeFirst();
      closedSet.add(current);

      // If reached the goal, return the path from start to the goal
      if ((options.goalRadius === 0 && current === goal) || (options.goalRadius > 0 && getDistBetweenNodes(current, goal) <= options.goalRadius)) {
         let currentNode: PathfindingNodeIndex | undefined = current;
         
         // Reconstruct the path
         const path = new Array<PathfindingNodeIndex>();
         // @Speed: two accesses
         while (typeof currentNode !== "undefined") {
            path.splice(0, 0, currentNode);
            currentNode = cameFrom[currentNode];
         }
         return path;
      }

      const currentGScore = gScore[current];
      
      const nodeX = current % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
      const nodeY = Math.floor(current / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1;
      
      const neighbours = new Array<PathfindingNodeIndex>();

      // Left neighbour
      const leftNode = getNode(nodeX - 1, nodeY);
      if (!closedSet.has(leftNode)) {
         if (nodeIsAccessibleForEntity(leftNode, ignoredGroupID, pathfindingEntityFootprint)) {
            neighbours.push(leftNode);
         }
         closedSet.add(leftNode);
      }
      
      // Right neighbour
      const rightNode = getNode(nodeX + 1, nodeY);
      if (!closedSet.has(rightNode)) {
         if (nodeIsAccessibleForEntity(rightNode, ignoredGroupID, pathfindingEntityFootprint)) {
            neighbours.push(rightNode);
         }
         closedSet.add(rightNode);
      }

      // Bottom neighbour
      const bottomNode = getNode(nodeX, nodeY - 1);
      if (!closedSet.has(bottomNode)) {
         if (nodeIsAccessibleForEntity(bottomNode, ignoredGroupID, pathfindingEntityFootprint)) {
            neighbours.push(bottomNode);
         }
         closedSet.add(bottomNode);
      }

      // Top neighbour
      const topNode = getNode(nodeX, nodeY + 1);
      if (!closedSet.has(topNode)) {
         if (nodeIsAccessibleForEntity(topNode, ignoredGroupID, pathfindingEntityFootprint)) {
            neighbours.push(topNode);
         }
         closedSet.add(topNode);
      }

      // Top left neighbour
      const topLeftNode = getNode(nodeX - 1, nodeY + 1);
      if (!closedSet.has(topLeftNode)) {
         if (nodeIsAccessibleForEntity(topLeftNode, ignoredGroupID, pathfindingEntityFootprint)) {
            neighbours.push(topLeftNode);
         }
         closedSet.add(topLeftNode);
      }

      // Top right neighbour
      const topRightNode = getNode(nodeX + 1, nodeY + 1);
      if (!closedSet.has(topRightNode)) {
         if (nodeIsAccessibleForEntity(topRightNode, ignoredGroupID, pathfindingEntityFootprint)) {
            neighbours.push(topRightNode);
         }
         closedSet.add(topRightNode);
      }

      // Bottom left neighbour
      const bottomLeftNode = getNode(nodeX - 1, nodeY - 1);
      if (!closedSet.has(bottomLeftNode)) {
         if (nodeIsAccessibleForEntity(bottomLeftNode, ignoredGroupID, pathfindingEntityFootprint)) {
            neighbours.push(bottomLeftNode);
         }
         closedSet.add(bottomLeftNode);
      }

      // Bottom right neighbour
      const bottomRightNode = getNode(nodeX + 1, nodeY - 1);
      if (!closedSet.has(bottomRightNode)) {
         if (nodeIsAccessibleForEntity(bottomRightNode, ignoredGroupID, pathfindingEntityFootprint)) {
            neighbours.push(bottomRightNode);
         }
         closedSet.add(bottomRightNode);
      }

      for (let i = 0; i < neighbours.length; i++) {
         const neighbour = neighbours[i];

         const tentativeGScore = currentGScore + aStarHeuristic(current, neighbour);
         const neighbourGScore = gScore[neighbour] !== undefined ? gScore[neighbour] : 999999;
         if (tentativeGScore < neighbourGScore) {
            cameFrom[neighbour] = current;
            gScore[neighbour] = tentativeGScore;
            fScore[neighbour] = tentativeGScore + aStarHeuristic(neighbour, goal);

            if (!openSet.containsNode(neighbour)) {
               openSet.addNode(neighbour);
            }
         }
      }
   }

   switch (options.failureDefault) {
      case PathfindFailureDefault.returnClosest: {
         const evaluatedNodes = Object.keys(gScore);

         if (evaluatedNodes.length === 0) {
            throw new Error();
         }
         
         // Find the node which is the closest to the goal
         let minHScore = 9999999999;
         let closestNodeToGoal!: PathfindingNodeIndex;
         for (let i = 0; i < evaluatedNodes.length; i++) {
            const node = Number(evaluatedNodes[i]);

            const hScore = aStarHeuristic(node, goal);
            if (hScore < minHScore) {
               minHScore = hScore;
               closestNodeToGoal = node;
            }
         }
         
         // Construct the path back from that node
         // @Cleanup: Copy and paste
         let current = closestNodeToGoal;
         const path: Array<PathfindingNodeIndex> = [current];
         while (typeof cameFrom[current] !== "undefined") {
            current = cameFrom[current];
            path.splice(0, 0, current);
         }
         return path;
      }
      case PathfindFailureDefault.returnEmpty: {
         if (!OPTIONS.inBenchmarkMode) {
            console.warn("FAILURE");
            console.trace();
         }
         return [];
      }
      case PathfindFailureDefault.throwError: {
         // @Temporary
         // throw new Error("Pathfinding failed!");
         return [];
      }
   }
}

const pathBetweenNodesIsClear = (node1: PathfindingNodeIndex, node2: PathfindingNodeIndex, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean => {
   // Convert to node coordinates
   const x0 = node1 % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
   const y0 = Math.floor(node1 / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1;
   const x1 = node2 % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
   const y1 = Math.floor(node2 / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1;
   
   const dx = Math.abs(x0 - x1);
   const dy = Math.abs(y0 - y1);

   // Starting tile coordinates
   let x = Math.floor(x0);
   let y = Math.floor(y0);

   const dt_dx = 1 / dx; 
   const dt_dy = 1 / dy;

   let n = 1;
   let x_inc, y_inc;
   let t_next_vertical, t_next_horizontal;

   if (dx === 0) {
      x_inc = 0;
      t_next_horizontal = dt_dx; // Infinity
   } else if (x1 > x0) {
      x_inc = 1;
      n += Math.floor(x1) - x;
      t_next_horizontal = (x + 1 - x0) * dt_dx;
   } else {
      x_inc = -1;
      n += x - Math.floor(x1);
      t_next_horizontal = (x0 - x) * dt_dx;
   }

   if (dy === 0) {
      y_inc = 0;
      t_next_vertical = dt_dy; // Infinity
   } else if (y1 > y0) {
      y_inc = 1;
      n += Math.floor(y1) - y;
      t_next_vertical = (y + 1 - y0) * dt_dy;
   } else {
      y_inc = -1;
      n += y - Math.floor(y1);
      t_next_vertical = (y0 - y) * dt_dy;
   }

   for (; n > 0; n--) {
      const node = getNode(x, y);
      if (!nodeIsAccessibleForEntity(node, ignoredGroupID, pathfindingEntityFootprint)) {
         return false;
      }

      if (t_next_vertical < t_next_horizontal) {
         y += y_inc;
         t_next_vertical += dt_dy;
      } else {
         x += x_inc;
         t_next_horizontal += dt_dx;
      }
   }

   return true;
}

export function smoothPath(path: ReadonlyArray<PathfindingNodeIndex>, ignoredGroupID: number, pathfindingEntityFootprint: number): Array<PathfindingNodeIndex> {
   const smoothedPath = new Array<PathfindingNodeIndex>();
   let lastCheckpoint = path[0];
   let previousNode = path[1];
   for (let i = 2; i < path.length; i++) {
      const node = path[i];

      if (!pathBetweenNodesIsClear(node, lastCheckpoint, ignoredGroupID, pathfindingEntityFootprint)) {
         smoothedPath.push(previousNode);
         lastCheckpoint = previousNode;
      }

      previousNode = node;
   }
   
   // If the path was always clear (lastCheckpoint is never updated), add the first node
   if (lastCheckpoint === path[0]) {
      smoothedPath.push(lastCheckpoint);
   }
   smoothedPath.push(path[path.length - 1]);

   return smoothedPath;
}

export function getVisiblePathfindingNodeOccupances(visibleChunkBounds: VisibleChunkBounds): ReadonlyArray<PathfindingNodeIndex> {
   // @Hack @Incomplete: Adding 1 to the max vals may cause extra nodes to be sent
   const minNodeX = Math.ceil(visibleChunkBounds[0] * Settings.CHUNK_UNITS / PathfindingSettings.NODE_SEPARATION);
   const maxNodeX = Math.floor((visibleChunkBounds[1] + 1) * Settings.CHUNK_UNITS / PathfindingSettings.NODE_SEPARATION);
   const minNodeY = Math.ceil(visibleChunkBounds[2] * Settings.CHUNK_UNITS / PathfindingSettings.NODE_SEPARATION);
   const maxNodeY = Math.floor((visibleChunkBounds[3] + 1) * Settings.CHUNK_UNITS / PathfindingSettings.NODE_SEPARATION);

   const occupances = new Array<PathfindingNodeIndex>();
   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const node = getNode(nodeX, nodeY);
         if (nodeGroupIDs[node].length > 0) {
            occupances.push(node);
         }
      }
   }

   return occupances;
}

export function entityCanBlockPathfinding(entity: EntityID): boolean {
   const entityType = getEntityType(entity);
   return entityType !== EntityType.itemEntity
      && entityType !== EntityType.slimeSpit
      && !ProjectileComponentArray.hasComponent(entity)
      && entityType !== EntityType.slimewisp
      && entityType !== EntityType.blueprintEntity;
}

export function getEntityPathfindingGroupID(entity: EntityID): number {
   switch (getEntityType(entity)!) {
      case EntityType.door:
      case EntityType.player:
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: {
         const tribeComponent = TribeComponentArray.getComponent(entity);
         return tribeComponent.tribe.pathfindingGroupID;
      }
      default: {
         return 0;
      }
   }
}

export function updateEntityPathfindingNodeOccupance(entity: EntityID): void {
   const pathfindingGroupID = getEntityPathfindingGroupID(entity);

   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const node of transformComponent.occupiedPathfindingNodes) {
      markPathfindingNodeClearance(node, pathfindingGroupID);
   }
   transformComponent.occupiedPathfindingNodes = new Set();

   const occupiedPathfindingNodes = transformComponent.occupiedPathfindingNodes;

   const hitboxes = transformComponent.hitboxes;
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
   
      // Add to occupied pathfinding nodes
      addHitboxOccupiedNodes(occupiedPathfindingNodes, pathfindingGroupID, hitbox);
   }
}

export function updateDynamicPathfindingNodes(): void {
   if (getGameTicks() % 3 !== 0) {
      return;
   }

   for (let i = 0; i < dirtyPathfindingEntities.length; i++) {
      const entity = dirtyPathfindingEntities[i];
      updateEntityPathfindingNodeOccupance(entity);

      const physicsComponent = PhysicsComponentArray.getComponent(entity);
      physicsComponent.pathfindingNodesAreDirty = false;
   }

   dirtyPathfindingEntities = [];
}

export function clearEntityPathfindingNodes(entity: EntityID): void {
   const groupID = getEntityPathfindingGroupID(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // Remove occupied pathfinding nodes
   for (const node of transformComponent.occupiedPathfindingNodes) {
      markPathfindingNodeClearance(node, groupID);
   }
}