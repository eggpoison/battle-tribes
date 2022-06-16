import Board, { Coordinates } from "./Board";

const ADJACENT_TILE_OFFSETS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const;

const getAdjacentTileCoordinates = (coordinates: Coordinates): Array<Coordinates> => {
   const adjacentTileCoordinates = new Array<Coordinates>();

   main: for (const tileOffset of ADJACENT_TILE_OFFSETS) {
      const childCoordinates: [number, number] = [coordinates[0] + tileOffset[0], coordinates[1] + tileOffset[1]];

      // Make sure the coordinates are in the board
      if (childCoordinates[0] < 0 || childCoordinates[0] >= Board.dimensions || childCoordinates[1] < 0 || childCoordinates[1] >= Board.dimensions) {
         continue;
      }

      // Make sure the tile can be walked on
      if (Board.getTile(...childCoordinates).isWall) {
         continue;
      }

      // Don't try to walk through walls
      if (Math.abs(tileOffset[0]) + Math.abs(tileOffset[1]) === 2) {
         const testTile1Coordinates = [childCoordinates[0], coordinates[1]] as const;
         const testTile2Coordinates = [coordinates[0], childCoordinates[1]] as const;
         const tileTileCoordinates = [testTile1Coordinates, testTile2Coordinates] as const;

         for (const coordinates of tileTileCoordinates) {
            if (Board.getTile(...coordinates).isWall) {
               continue main;
            }
         }
      }

      adjacentTileCoordinates.push(childCoordinates);
   }

   return adjacentTileCoordinates;
}

const calculateDistanceFromStart = (startTileCoordinates: Coordinates, coordinates: Coordinates): number => {
   return Math.sqrt(Math.pow(startTileCoordinates[0] - coordinates[1], 2) + Math.pow(startTileCoordinates[1] - coordinates[1], 2));
}

const calculateHeuristic = (coordinates: Coordinates, endTileCoordinates: Coordinates): number => {
   // Distance between the current and end tiles
   return Math.pow(coordinates[0] - endTileCoordinates[0], 2) + Math.pow(coordinates[1] - endTileCoordinates[1], 2);
}

class Node {
   public parent: Node | null;
   public coordinates: Coordinates;
   
   public f: number;
   public g: number;

   constructor(parent: Node | null, startTileCoordinates: Coordinates, coordinates: Coordinates, endTileCoordinates: Coordinates) {
      this.parent = parent;
      this.coordinates = coordinates;

      this.g = calculateDistanceFromStart(startTileCoordinates, coordinates);
      const h = calculateHeuristic(coordinates, endTileCoordinates);

      this.f = this.g + h;
   }
}

/**
 * Searches for the shortest path between two tiles
 * @param startTile The tile coordinates to start the search at
 * @param endTile The tile coordinates to end at
 */
export function findPath(startTile: Coordinates, endTile: Coordinates): Array<Coordinates> {
   const openList = new Array<Node>();
   const closedList = new Array<Node>();

   // Add the starting tile to the list to be searched
   const startNode = new Node(null, startTile, startTile, endTile);
   openList.push(startNode);

   let finalNode!: Node;

   while (openList.length > 0) {
      // Look for the lowest cost node in the list
      // This node is referred to as the 'current node'
      let currentNode!: Node;
      let lowestCost: number = Number.MAX_SAFE_INTEGER;
      for (const node of openList) {
         if (node.f < lowestCost) {
            currentNode = node;
            lowestCost = node.f;
         }
      }

      // You've found the goal!
      if (currentNode.coordinates[0] === endTile[0] && currentNode.coordinates[1] === endTile[1]) {
         finalNode = currentNode;
         break;
      }

      // Remove the closest node from the open list and add it to the closed list
      openList.splice(openList.indexOf(currentNode));
      closedList.push(currentNode);

      const children = getAdjacentTileCoordinates(currentNode.coordinates);

      main: for (const childCoordinates of children) {
         // Skip if the child is already in the closed list
         for (const node of closedList) {
            if (node.coordinates[0] === childCoordinates[0] && node.coordinates[1] === childCoordinates[1]) {
               continue main;
            }
         }

         const child = new Node(currentNode, startTile, childCoordinates, endTile);

         // Skip if the child is already in the open list
         for (const node of openList) {
            if (node.coordinates[0] === child.coordinates[1] && node.coordinates[1] === child.coordinates[1]) {
               if (child.g > node.g) {
                  continue main;
               }
            }
         }

         openList.push(child);
      }
   }

   // Create the path
   const path = new Array<Coordinates>();
   let currentNode: Node | null = finalNode;
   while (currentNode !== null) {
      path.push(currentNode.coordinates);
      currentNode = currentNode.parent;
   }

   return path.reverse();
}