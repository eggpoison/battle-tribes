import { PathfindingSettings } from "../../shared/dist/settings.js";

// @Cleanup: name. should just be pathfindingVars
export const enum PathfindingServerVars {
   // @Hack?
   WALL_TILE_OCCUPIED_ID = 3427823
}

// @Speed: not in pathfinding file
export function getPathfindingNode(nodeX: number, nodeY: number): number {
   return (nodeY + 1) * PathfindingSettings.NODES_IN_WORLD_WIDTH + nodeX + 1;
}