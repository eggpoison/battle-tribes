import { Box, calculateBoxBounds, _bounds, createRectangularBox, getBoxCollisionResult } from "../../../../shared/dist/boxes.js";
import { boxIsCollidingWithSubtile } from "../../../../shared/dist/collision.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { StructureType } from "../../../../shared/dist/structures.js";
import { getSubtileIndex } from "../../../../shared/dist/subtiles.js";
import { Point, randFloat, randAngle } from "../../../../shared/dist/utils.js";
import { getTileIndexIncludingEdges } from "../../../../shared/dist/tiles.js";
import { boxArraysAreColliding, boxHasCollisionWithBoxes } from "../../collision-detection.js";
import { getConfigTransformComponent } from "../../components.js";
import { createStructureConfig } from "../../structure-placement.js";
import { getTribes } from "../../world.js";
import { SafetyNode, addBoxesOccupiedNodes } from "../ai-building.js";
import TribeBuildingLayer from "./TribeBuildingLayer.js";

const enum Vars {
   INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE = 550
}

export interface BuildingCandidate {
   readonly buildingLayer: TribeBuildingLayer;
   readonly position: Point;
   readonly rotation: number;
   readonly boxes: readonly Box[];
}

export function createBuildingCandidate(entityType: StructureType, buildingLayer: TribeBuildingLayer, x: number, y: number, angle: number): BuildingCandidate {
   // @SUPAHACK
   const tribe = getTribes()[0];
   const entityConfig = createStructureConfig(tribe, entityType, x, y, angle, []);
   const transformComponent = getConfigTransformComponent(entityConfig.components);

   const candidate: BuildingCandidate = {
      buildingLayer: buildingLayer,
      position: new Point(x, y),
      rotation: angle,
      boxes: transformComponent.hitboxes.map(hitbox => hitbox.box)
   };

   return candidate;
}

export function buildingCandidateIsValid(candidate: BuildingCandidate): boolean {
   // Make sure the hitboxes don't go outside the world
   for (const box of candidate.boxes) {
      calculateBoxBounds(box);
      if (_bounds.minX < 0 || _bounds.maxX >= Settings.WORLD_UNITS || _bounds.minY < 0 || _bounds.maxY >= Settings.WORLD_UNITS) {
         return false;
      }
   }
   
   // Make sure the building isn't in any walls
   const layer = candidate.buildingLayer.layer;
   for (const box of candidate.boxes) {
      calculateBoxBounds(box);
      const minSubtileX = Math.floor(_bounds.minX / Settings.SUBTILE_SIZE);
      const maxSubtileX = Math.floor(_bounds.maxX / Settings.SUBTILE_SIZE);
      const minSubtileY = Math.floor(_bounds.minY / Settings.SUBTILE_SIZE);
      const maxSubtileY = Math.floor(_bounds.maxY / Settings.SUBTILE_SIZE);

      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            if (layer.subtileIsWall(subtileIndex) && boxIsCollidingWithSubtile(box, subtileX, subtileY)) {
               return false;
            }
         }
      }
   }

   // Make sure the building isn't over any building blocking tiles
   // @Copynpaste from structureIntersectsWithBuildingBlockingTiles in shared
   for (const box of candidate.boxes) {
      calculateBoxBounds(box);
      const minTileX = Math.floor(_bounds.minX / Settings.TILE_SIZE);
      const maxTileX = Math.floor(_bounds.maxX / Settings.TILE_SIZE);
      const minTileY = Math.floor(_bounds.minY / Settings.TILE_SIZE);
      const maxTileY = Math.floor(_bounds.maxY / Settings.TILE_SIZE);

      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
            const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
            if (!layer.buildingBlockingTiles.has(tileIndex)) {
               continue;
            }
            
            // @Speed
            const tileBox = createRectangularBox((tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE, 0, 0, 0, Settings.TILE_SIZE, Settings.TILE_SIZE);

            if (getBoxCollisionResult(box, tileBox).isColliding) {
               return false;
            }
         }
      }
   }
   
   // Make sure the space doesn't collide with any buildings or their restricted building areas
   // @Speed!!
   for (const virtualBuilding of candidate.buildingLayer.virtualStructures) {
      if (boxArraysAreColliding(candidate.boxes, virtualBuilding.boxes)) {
         return false;
      }

      for (const restrictedArea of virtualBuilding.restrictedBuildingAreas) {
         if (boxHasCollisionWithBoxes(restrictedArea.box, candidate.boxes)) {
            return false;
         }
      }
   }

   return true;
}

export function buildingCandidateIsOnSafeNode(candidate: BuildingCandidate): boolean {
   const occupiedNodes = new Set<SafetyNode>();
   // @Speed
   addBoxesOccupiedNodes(candidate.boxes, occupiedNodes);
   
   for (const node of occupiedNodes) {
      if (candidate.buildingLayer.safetyNodes.has(node)) {
         return true;
      }
   }

   return false;
}

/** Generates a random valid building location. If returns null, then something has gone really wrong. */
export function generateBuildingCandidate(buildingLayer: TribeBuildingLayer, entityType: StructureType): BuildingCandidate | null {
   // If there are no virtual buildings, we can't use any existing buildings as reference so we go off the start position of the tribe
   let minX: number;
   let maxX: number;
   let minY: number;
   let maxY: number;
   if (buildingLayer.virtualStructures.length === 0) {
      minX = buildingLayer.tribe.startPosition.x - Vars.INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE;
      maxX = buildingLayer.tribe.startPosition.x + Vars.INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE;
      minY = buildingLayer.tribe.startPosition.y - Vars.INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE;
      maxY = buildingLayer.tribe.startPosition.y + Vars.INITIAL_BUILDING_CANDIDATE_GENERATION_RANGE;
   } else {
      // Find min and max node positions
      // @Speed
      let minNodeX = Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1;
      let maxNodeX = 0;
      let minNodeY = Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1;
      let maxNodeY = 0;
      // @Speed: if a tribe builds something in the bottom right and top left of the map then this will be brutal.
      for (const node of buildingLayer.occupiedSafetyNodes) {
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
   
      minX = minNodeX * Settings.SAFETY_NODE_SEPARATION - 150;
      maxX = (maxNodeX + 1) * Settings.SAFETY_NODE_SEPARATION + 150;
      minY = minNodeY * Settings.SAFETY_NODE_SEPARATION - 150;
      maxY = (maxNodeY + 1) * Settings.SAFETY_NODE_SEPARATION + 150;
   }

   let attempts = 0;
   while (attempts++ < 999) {
      const x = randFloat(minX, maxX);
      const y = randFloat(minY, maxY);
      const rotation = randAngle();
      
      const candidate = createBuildingCandidate(entityType, buildingLayer, x, y, rotation);

      if ((buildingLayer.virtualStructures.length === 0 || buildingCandidateIsOnSafeNode(candidate)) && buildingCandidateIsValid(candidate)) {
         return candidate;
      }
   }

   return null;
}