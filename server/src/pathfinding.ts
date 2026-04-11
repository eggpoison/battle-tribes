import { PathfindingNodeIndex } from "battletribes-shared/client-server-types";
import { Entity, EntityType } from "battletribes-shared/entities";
import { PathfindingSettings, Settings } from "battletribes-shared/settings";
import { distance, distBetweenPointAndRectangularBox, getTileX, getTileY, Point, TileIndex } from "battletribes-shared/utils";
import PathfindingHeap from "./PathfindingHeap";
import { TribeComponentArray } from "./components/TribeComponent";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { ProjectileComponentArray } from "./components/ProjectileComponent";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { boxIsCircular, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { getEntityLayer, getEntityType } from "./world";
import PlayerClient, { PlayerClientVars } from "./server/PlayerClient";
import { CollisionGroup, getEntityCollisionGroup } from "../../shared/src/collision-groups";
import Layer from "./Layer";
import { getPathfindingNode, PathfindingServerVars } from "./pathfinding-utils";
import { TileType } from "../../shared/src/tiles";
import { getTilesOfType } from "./census";
import { surfaceLayer } from "./layers";
import { TribeMemberComponentArray } from "./components/TribeMemberComponent";
import { Hitbox } from "./hitboxes";
import { getDistanceFromPointToEntity } from "./ai-shared";
import { _bounds } from "../../shared/src/boxes/BaseBox";

const enum Vars {
   NODE_ACCESSIBILITY_RESOLUTION = 3
}

export interface Path {
   readonly layer: Layer;
   readonly goalX: number;
   readonly goalY: number;
   readonly rawPath: ReadonlyArray<PathfindingNodeIndex>;
   // @Cleanup: rename to something like 'active path'
   readonly smoothPath: Array<PathfindingNodeIndex>;
   readonly visitedNodes: ReadonlyArray<PathfindingNodeIndex>;
   readonly isFailed: boolean;
}

export const enum PathfindFailureDefault {
   /** Default */
   none,
   /** Returns the path to the node which was closest to the goal */
   returnClosest
}

export interface PathfindOptions {
   readonly goalRadius: number;
   readonly failureDefault: PathfindFailureDefault;
   /** Determines the node budget used when finding a path. If not present, an appropriate node budget will be automatically determined. */
   readonly nodeBudget?: number;
}

const activeGroupIDs = new Array<number>();

const markPathfindingNodeOccupance = (layer: Layer, node: PathfindingNodeIndex, groupID: number): void => {
   layer.nodeGroupIDs[node].push(groupID);
}

const markPathfindingNodeClearance = (layer: Layer, node: PathfindingNodeIndex, groupID: number): void => {
   const groupIDs = layer.nodeGroupIDs[node];
   for (let i = 0; i < groupIDs.length; i++) {
      const currentGroupID = groupIDs[i];
      if (currentGroupID === groupID) {
         groupIDs.splice(i, 1);
         return;
      }
   }
}

const footprintNodeOffsets = new Array<Array<number>>();

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

const nodeIsOccupied = (layer: Layer, node: PathfindingNodeIndex, ignoredGroupID: number): boolean => {
   const groupIDs = layer.nodeGroupIDs[node];
   for (let i = 0; i < groupIDs.length; i++) {
      const currentGroupID = groupIDs[i];
      if (currentGroupID !== ignoredGroupID) {
         return true;
      }
   }
   return false;
}

const slowAccessibilityCheck = (layer: Layer, node: PathfindingNodeIndex, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean => {
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
               const node = getPathfindingNode(Math.round(nodeX), Math.round(nodeY));

               if (nodeIsOccupied(layer, node, ignoredGroupID)) {
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
const nodeIsAccessibleForEntity = (layer: Layer, node: PathfindingNodeIndex, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean => {
   // @Temporary: fast doesn't seem to work properly?
   // return fastAccessibilityCheck(node, ignoredGroupID, pathfindingEntityFootprint, a) || slowAccessibilityCheck(node, ignoredGroupID, pathfindingEntityFootprint, a);
   return slowAccessibilityCheck(layer, node, ignoredGroupID, pathfindingEntityFootprint);
}

const addCircularHitboxOccupiedNodes = (layer: Layer, occupiedPathfindingNodes: Set<PathfindingNodeIndex>, pathfindingGroupID: number, hitbox: Hitbox, entityType: EntityType): void => {
   const box = hitbox.box as CircularBox;
   
   box.calculateBounds();
   const minX = _bounds.minX;
   const maxX = _bounds.maxX;
   const minY = _bounds.minY;
   const maxY = _bounds.maxY;

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

   // Make soft hitboxes take up less node radius so that it easier to pathfind around them
   let extraRadius = hitbox.collisionType === HitboxCollisionType.hard ? 8 : 0;
   if (entityType === EntityType.iceSpikes || entityType === EntityType.cactus) {
      extraRadius += 16;
   }
   
   const hitboxNodeRadius = (box.radius + extraRadius) / PathfindingSettings.NODE_SEPARATION;
   const hitboxNodeRadiusSquared = hitboxNodeRadius * hitboxNodeRadius;

   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const xDiff = nodeX - centerX;
         const yDiff = nodeY - centerY;
         if (xDiff * xDiff + yDiff * yDiff <= hitboxNodeRadiusSquared) {
            const node = getPathfindingNode(nodeX, nodeY);
            // Add
            if (!occupiedPathfindingNodes.has(node)) {
               markPathfindingNodeOccupance(layer, node, pathfindingGroupID);
               occupiedPathfindingNodes.add(node);
            }
         }
      }
   }
}

const addRectangularHitboxOccupiedNodes = (layer: Layer, occupiedPathfindingNodes: Set<PathfindingNodeIndex>, pathfindingGroupID: number, hitbox: Hitbox): void => {
   const box = hitbox.box as RectangularBox;
   
   box.calculateBounds();
   const minX = _bounds.minX;
   const maxX = _bounds.maxX;
   const minY = _bounds.minY;
   const maxY = _bounds.maxY;

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
            const node = getPathfindingNode(nodeX, nodeY);
            // @Temporary
            if (node >= PathfindingSettings.NODES_IN_WORLD_WIDTH*PathfindingSettings.NODES_IN_WORLD_WIDTH) {
               throw new Error();
            }

            // Add
            if (!occupiedPathfindingNodes.has(node)) {
               markPathfindingNodeOccupance(layer, node, pathfindingGroupID);
               occupiedPathfindingNodes.add(node);
            }
         }
      }
   }
}

const addHitboxOccupiedNodes = (layer: Layer, occupiedPathfindingNodes: Set<PathfindingNodeIndex>, pathfindingGroupID: number, hitbox: Hitbox, entityType: EntityType): void => {
   if (boxIsCircular(hitbox.box)) {
      addCircularHitboxOccupiedNodes(layer, occupiedPathfindingNodes, pathfindingGroupID, hitbox, entityType);
   } else {
      addRectangularHitboxOccupiedNodes(layer, occupiedPathfindingNodes, pathfindingGroupID, hitbox);
   }
}

export function replacePathfindingNodeGroupID(layer: Layer, node: PathfindingNodeIndex, oldGroupID: number, newGroupID: number): void {
   const groupIDs = layer.nodeGroupIDs[node];
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

export function markWallTileInPathfinding(layer: Layer, tileX: number, tileY: number): void {
   const x = tileX * Settings.TILE_SIZE;
   const y = tileY * Settings.TILE_SIZE;

   const minNodeX = Math.ceil(x / PathfindingSettings.NODE_SEPARATION);
   const minNodeY = Math.floor(y / PathfindingSettings.NODE_SEPARATION);
   const maxNodeX = Math.ceil((x + Settings.TILE_SIZE) / PathfindingSettings.NODE_SEPARATION);
   const maxNodeY = Math.floor((y + Settings.TILE_SIZE) / PathfindingSettings.NODE_SEPARATION);

   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const node = getPathfindingNode(nodeX, nodeY);
         markPathfindingNodeOccupance(layer, node, PathfindingServerVars.WALL_TILE_OCCUPIED_ID);
      }
   }
}

export function getClosestPathfindNode(x: number, y: number): PathfindingNodeIndex {
   // use floor not round cuz that makes sense for this
   const nodeX = Math.floor(x / PathfindingSettings.NODE_SEPARATION);
   const nodeY = Math.floor(y / PathfindingSettings.NODE_SEPARATION);
   return getPathfindingNode(nodeX, nodeY);
}

export function positionIsAccessible(layer: Layer, x: number, y: number, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean {
   const node = getClosestPathfindNode(x, y);
   return nodeIsAccessibleForEntity(layer, node, ignoredGroupID, pathfindingEntityFootprint);
}

const nodeIndexToXY = (node: PathfindingNodeIndex): Point => {
   const nodeX = node % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
   const nodeY = Math.floor(node / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1;
   return new Point(nodeX, nodeY);
}

const nodeXYToWorldPos = (nodeXY: Point): Point => {
   const x = (nodeXY.x + 0.5) * PathfindingSettings.NODE_SEPARATION;
   const y = (nodeXY.y + 0.5) * PathfindingSettings.NODE_SEPARATION;
   return new Point(x, y);
}

export function getPathfindingNodePos(node: PathfindingNodeIndex): Point {
   return nodeXYToWorldPos(nodeIndexToXY(node));
}

export function getDistanceToNode(transformComponent: TransformComponent, node: PathfindingNodeIndex): number {
   const nodeWorldPos = getPathfindingNodePos(node);
   return getDistanceFromPointToEntity(nodeWorldPos, transformComponent);
}

export function getAngleToNode(transformComponent: TransformComponent, node: PathfindingNodeIndex): number {
   const hitbox = transformComponent.hitboxes[0]; // @Hack
   const nodePos = getPathfindingNodePos(node);
   return hitbox.box.position.angleTo(nodePos);
}

export function entityHasReachedNode(transformComponent: TransformComponent, node: PathfindingNodeIndex): boolean {
   return getDistanceToNode(transformComponent, node) <= PathfindingSettings.NODE_REACH_DIST;
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

const getNodeDistBetweenNodes = (node1: PathfindingNodeIndex, node2: PathfindingNodeIndex): number => {
   const node1XY = nodeIndexToXY(node1);
   const node2XY = nodeIndexToXY(node2);
   return node1XY.distanceTo(node2XY);
}

export function getEntityFootprint(radius: number): number {
   // @Incomplete
   // @Hack: Add 1 to account for the fact that a node's occupance can mean that the hitbox overlaps anywhere in the 3x3 grid of nodes around that node
   
   return radius / PathfindingSettings.NODE_SEPARATION;
}

export function pathIsClear(layer: Layer, startX: number, startY: number, endX: number, endY: number, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean {
   const start = getClosestPathfindNode(startX, startY);
   const goal = getClosestPathfindNode(endX, endY);

   return pathBetweenNodesIsClear(layer, start, goal, ignoredGroupID, pathfindingEntityFootprint);
}

// @Incomplete: we don't want to find the closest in terms of absolute distance, we want the closest in terms of walking distance.
export function findClosestDropdownTile(startX: number, startY: number): TileIndex {
   const dropdownTiles = getTilesOfType(surfaceLayer, TileType.dropdown);
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestTileIndex = 0;
   for (const tileIndex of dropdownTiles) {
      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);

      const x = (tileX + 0.5) * Settings.TILE_SIZE;
      const y = (tileY + 0.5) * Settings.TILE_SIZE;

      const dist = distance(startX, startY, x, y);
      if (dist < minDist) {
         minDist = dist;
         closestTileIndex = tileIndex;
      }
   }

   return closestTileIndex;
}

const reconstructRawPath = (finalNode: PathfindingNodeIndex, cameFrom: Record<PathfindingNodeIndex, number>): Array<PathfindingNodeIndex> => {
   let currentNode: PathfindingNodeIndex | undefined = finalNode;
   
   // Reconstruct the path
   const path = new Array<PathfindingNodeIndex>();
   // @Speed: two accesses
   while (typeof currentNode !== "undefined") {
      path.splice(0, 0, currentNode);
      currentNode = cameFrom[currentNode];
   }

   return path;
}

/**
 * Attempts to find a path from one position to another in a single layer. Uses A* pathfinding.
 * @param pathfindingEntityFootprint Radius of the entity's footprint in nodes
 */
export function runPathfindingSingleLayer(layer: Layer, startX: number, startY: number, goalX: number, goalY: number, ignoredGroupID: number, pathfindingEntityFootprint: number, options: PathfindOptions): Path {
   const start = getClosestPathfindNode(startX, startY);
   const goal = getClosestPathfindNode(goalX, goalY);

   const cameFrom: Record<PathfindingNodeIndex, number> = {};
   
   const gScore: Record<PathfindingNodeIndex, number> = {};
   gScore[start] = 0;

   const fScore: Record<PathfindingNodeIndex, number> = {};
   fScore[start] = aStarHeuristic(start, goal);

   const openSet = new PathfindingHeap(gScore, fScore);
   openSet.addNode(start);

   const closedSet = new Set<PathfindingNodeIndex>();

   const checkNeighbour = (currentNode: PathfindingNodeIndex, neighbour: PathfindingNodeIndex): void => {
      if (!closedSet.has(neighbour)) {
         if (nodeIsAccessibleForEntity(layer, neighbour, ignoredGroupID, pathfindingEntityFootprint)) {
            const tentativeGScore = gScore[currentNode] + aStarHeuristic(currentNode, neighbour);
            const neighbourGScore = gScore[neighbour];
            if (typeof neighbourGScore === "undefined" || tentativeGScore < neighbourGScore) {
               cameFrom[neighbour] = currentNode;
               gScore[neighbour] = tentativeGScore;
               fScore[neighbour] = tentativeGScore + aStarHeuristic(neighbour, goal);
         
               if (!openSet.containsNode(neighbour)) {
                  openSet.addNode(neighbour);
               }
            }
         }
         closedSet.add(neighbour);
      }
   }

   const nodeBudget = options.nodeBudget || (Math.floor(distance(startX, startY, goalX, goalY) * 4) + 40);
   
   for (let i = 0; openSet.currentItemCount > 0 && i < nodeBudget; i++) {
      const currentNode = openSet.removeFirst();
      closedSet.add(currentNode);

      // If reached the goal, return the path from start to the goal
      if ((options.goalRadius === 0 && currentNode === goal) || (options.goalRadius > 0 && getNodeDistBetweenNodes(currentNode, goal) <= options.goalRadius)) {
         const rawPath = reconstructRawPath(currentNode, cameFrom);
         return {
            layer: layer,
            goalX: goalX,
            goalY: goalY,
            rawPath: rawPath,
            smoothPath: smoothPath(layer, rawPath, ignoredGroupID, pathfindingEntityFootprint),
            visitedNodes: Array.from(closedSet),
            isFailed: false
         };
      }

      const nodeX = currentNode % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1;
      const nodeY = Math.floor(currentNode / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1;
      
      const leftNode = getPathfindingNode(nodeX - 1, nodeY);
      checkNeighbour(currentNode, leftNode);
      
      const rightNode = getPathfindingNode(nodeX + 1, nodeY);
      checkNeighbour(currentNode, rightNode);

      const bottomNode = getPathfindingNode(nodeX, nodeY - 1);
      checkNeighbour(currentNode, bottomNode);

      const topNode = getPathfindingNode(nodeX, nodeY + 1);
      checkNeighbour(currentNode, topNode);

      const topLeftNode = getPathfindingNode(nodeX - 1, nodeY + 1);
      checkNeighbour(currentNode, topLeftNode);

      const topRightNode = getPathfindingNode(nodeX + 1, nodeY + 1);
      checkNeighbour(currentNode, topRightNode);

      const bottomLeftNode = getPathfindingNode(nodeX - 1, nodeY - 1);
      checkNeighbour(currentNode, bottomLeftNode);

      const bottomRightNode = getPathfindingNode(nodeX + 1, nodeY - 1);
      checkNeighbour(currentNode, bottomRightNode);
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
         return {
            layer: layer,
            goalX: goalX,
            goalY: goalY,
            rawPath: path,
            smoothPath: smoothPath(layer, path, ignoredGroupID, pathfindingEntityFootprint),
            visitedNodes: Array.from(closedSet),
            isFailed: false
         };
      }
      case PathfindFailureDefault.none: {
         return {
            layer: layer,
            goalX: goalX,
            goalY: goalY,
            rawPath: [],
            smoothPath: [],
            visitedNodes: Array.from(closedSet),
            isFailed: true
         };
      }
   }
}

export function runPathfindingMultiLayer(startLayer: Layer, endLayer: Layer, startX: number, startY: number, endX: number, endY: number, ignoredGroupID: number, pathfindingEntityFootprint: number, options: PathfindOptions): Array<Path> {
   const paths = new Array<Path>();
   
   let x1: number;
   let y1: number;
   
   // If the goal is in a different layer, first move to the correct layer
   if (startLayer !== endLayer) {
      const targetDropdownTile = findClosestDropdownTile(startX, startY);
      
      const tileX = getTileX(targetDropdownTile);
      const tileY = getTileY(targetDropdownTile);
      x1 = (tileX + 0.5) * Settings.TILE_SIZE;
      y1 = (tileY + 0.5) * Settings.TILE_SIZE;

      const changeLayerOptions: PathfindOptions = {
         // Should move right on the goal
         goalRadius: 0,
         failureDefault: PathfindFailureDefault.none
      };
      const path = runPathfindingSingleLayer(startLayer, startX, startY, x1, y1, ignoredGroupID, pathfindingEntityFootprint, changeLayerOptions);

      paths.push(path);
   } else {
      x1 = startX;
      y1 = startY;
   }

   const path = runPathfindingSingleLayer(endLayer, x1, y1, endX, endY, ignoredGroupID, pathfindingEntityFootprint, options);
   paths.push(path);

   return paths;
}

const pathBetweenNodesIsClear = (layer: Layer, node1: PathfindingNodeIndex, node2: PathfindingNodeIndex, ignoredGroupID: number, pathfindingEntityFootprint: number): boolean => {
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
      const node = getPathfindingNode(x, y);
      if (!nodeIsAccessibleForEntity(layer, node, ignoredGroupID, pathfindingEntityFootprint)) {
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

export function smoothPath(layer: Layer, path: ReadonlyArray<PathfindingNodeIndex>, ignoredGroupID: number, pathfindingEntityFootprint: number): Array<PathfindingNodeIndex> {
   const smoothedPath = new Array<PathfindingNodeIndex>();
   let lastCheckpoint = path[0];
   let previousNode = path[1];
   for (let i = 2; i < path.length; i++) {
      const node = path[i];

      if (!pathBetweenNodesIsClear(layer, node, lastCheckpoint, ignoredGroupID, pathfindingEntityFootprint + 20 / PathfindingSettings.NODE_SEPARATION)) {
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

const clampPathfindingNodeXY = (x: number): number => {
   if (x < -1) {
      return -1;
   }
   if (x >= PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) {
      return PathfindingSettings.NODES_IN_WORLD_WIDTH - 2;
   }
   return x;
}

export function getVisiblePathfindingNodeOccupances(playerClient: PlayerClient): ReadonlyArray<PathfindingNodeIndex> {
   // @Copynpaste
   const minVisibleX = playerClient.lastViewedPositionX - playerClient.screenWidth * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleX = playerClient.lastViewedPositionX + playerClient.screenWidth * 0.5 + PlayerClientVars.VIEW_PADDING;
   const minVisibleY = playerClient.lastViewedPositionY - playerClient.screenHeight * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleY = playerClient.lastViewedPositionY + playerClient.screenHeight * 0.5 + PlayerClientVars.VIEW_PADDING;

   const minNodeX = clampPathfindingNodeXY(Math.floor(minVisibleX / PathfindingSettings.NODE_SEPARATION));
   const maxNodeX = clampPathfindingNodeXY(Math.floor(maxVisibleX / PathfindingSettings.NODE_SEPARATION));
   const minNodeY = clampPathfindingNodeXY(Math.floor(minVisibleY / PathfindingSettings.NODE_SEPARATION));
   const maxNodeY = clampPathfindingNodeXY(Math.floor(maxVisibleY / PathfindingSettings.NODE_SEPARATION));

   const occupances = new Array<PathfindingNodeIndex>();
   for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
      for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
         const node = getPathfindingNode(nodeX, nodeY);
         if (playerClient.lastLayer.nodeGroupIDs[node].length > 0) {
            occupances.push(node);
         }
      }
   }

   return occupances;
}

export function entityCanBlockPathfinding(entity: Entity): boolean {
   const entityType = getEntityType(entity);
   const collisionGroup = getEntityCollisionGroup(entityType);
   if (collisionGroup === CollisionGroup.none || collisionGroup === CollisionGroup.decoration) {
      return false;
   }
   
   return entityType !== EntityType.itemEntity
      && entityType !== EntityType.slimeSpit
      && !ProjectileComponentArray.hasComponent(entity)
      && entityType !== EntityType.slimewisp;
}

export function getEntityPathfindingGroupID(entity: Entity): number {
   if (getEntityType(entity) === EntityType.door || TribeMemberComponentArray.hasComponent(entity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      return tribeComponent.tribe.pathfindingGroupID;
   }

   return 0;
}

export function updateEntityPathfindingNodeOccupance(entity: Entity): void {
   const pathfindingGroupID = getEntityPathfindingGroupID(entity);
   const layer = getEntityLayer(entity);

   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const node of transformComponent.occupiedPathfindingNodes) {
      markPathfindingNodeClearance(layer, node, pathfindingGroupID);
   }
   transformComponent.occupiedPathfindingNodes = new Set();

   const occupiedPathfindingNodes = transformComponent.occupiedPathfindingNodes;
   const entityType = getEntityType(entity);
   
   for (const hitbox of transformComponent.hitboxes) {
      addHitboxOccupiedNodes(layer, occupiedPathfindingNodes, pathfindingGroupID, hitbox, entityType);
   }
}

export function updateDynamicPathfindingNodes(): void {
   // @Hack: This is done to reduce the fluctuation in tick time. However it also kinda bricks performance.
   // ideally instead we would just rotate between updating 3 groups of entities, doing one group each tick,
   // for constant performance while still doing a third of the work as usual.
   // if (getGameTicks() % 3 !== 0) {
   //    return;
   // }

   // Here I prefer to loop over all the entities instead of using a dirty array, to make
   // the performance more constant thanks to no garbage collection
   const activeEntities = TransformComponentArray.activeEntities;
   const activeComponents = TransformComponentArray.activeComponents;
   for (let i = 0; i < activeEntities.length; i++) {
      const transformComponent = activeComponents[i];
      if (transformComponent.pathfindingNodesAreDirty) {
         const entity = activeEntities[i];
         updateEntityPathfindingNodeOccupance(entity);
   
         transformComponent.pathfindingNodesAreDirty = false;
      }
   }
}

export function clearEntityPathfindingNodes(entity: Entity): void {
   const groupID = getEntityPathfindingGroupID(entity);
   const layer = getEntityLayer(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // Remove occupied pathfinding nodes
   for (const node of transformComponent.occupiedPathfindingNodes) {
      markPathfindingNodeClearance(layer, node, groupID);
   }
}

export function convertEntityPathfindingGroupID(entity: Entity, oldGroupID: number, newGroupID: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   for (const node of transformComponent.occupiedPathfindingNodes) {
      replacePathfindingNodeGroupID(layer, node, oldGroupID, newGroupID);
   }
}