import { SafetyNodeData, PotentialBuildingPlanData, BuildingPlanData, BuildingSafetyData, PotentialPlanSafetyData, WallSideNodeData, TribeWallData, WallConnectionData } from "battletribes-shared/ai-building-types";
import { VisibleChunkBounds, RestrictedBuildingAreaData } from "battletribes-shared/client-server-types";
import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import Layer from "../Layer";
import Tribe, { BuildingPlan, BuildingPlanType } from "../Tribe";
import { SafetyNode, getSafetyNode } from "./ai-building";
import { buildingIsInfrastructure, getBuildingSafety } from "./ai-building-heuristics";
import { TribeComponentArray } from "../components/TribeComponent";
import { ITEM_INFO_RECORD, PlaceableItemInfo } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../components/TransformComponent";

// @Cleanup: should this be here?
export function getVisibleTribes(chunkBounds: VisibleChunkBounds): ReadonlyArray<Tribe> {
   // Calculate visible tribes
   const visibleTribes = new Array<Tribe>();
   for (let chunkX = chunkBounds[0]; chunkX <= chunkBounds[1]; chunkX++) {
      for (let chunkY = chunkBounds[2]; chunkY <= chunkBounds[3]; chunkY++) {
         const chunk = Layer.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (TribeComponentArray.hasComponent(entity)) {
               const tribeComponent = TribeComponentArray.getComponent(entity);
               if (visibleTribes.indexOf(tribeComponent.tribe) === -1) {
                  visibleTribes.push(tribeComponent.tribe);
               }
            }
         }
      }
   }
   return visibleTribes;
}

export function getVisibleSafetyNodesData(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<SafetyNodeData> {
   const safetyNodesData = new Array<SafetyNodeData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      const minNodeX = Math.floor(chunkBounds[0] * Settings.CHUNK_UNITS / Settings.SAFETY_NODE_SEPARATION);
      const maxNodeX = Math.floor((chunkBounds[1] + 1) * Settings.CHUNK_UNITS / Settings.SAFETY_NODE_SEPARATION) - 1;
      const minNodeY = Math.floor(chunkBounds[2] * Settings.CHUNK_UNITS / Settings.SAFETY_NODE_SEPARATION);
      const maxNodeY = Math.floor((chunkBounds[3] + 1) * Settings.CHUNK_UNITS / Settings.SAFETY_NODE_SEPARATION) - 1;
      for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
         for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
            const nodeIndex = getSafetyNode(nodeX, nodeY);

            const safety = tribe.safetyRecord[nodeIndex];
            if (safety === undefined) {
               continue;
            }

            // Check if the node is contained
            let isContained = false;
            for (let i = 0; i < tribe.areas.length; i++) {
               const area = tribe.areas[i];
               if (area.containedNodes.has(nodeIndex)) {
                  isContained = true;
                  break;
               }
            }
            
            safetyNodesData.push({
               index: nodeIndex,
               safety: safety,
               isOccupied: tribe.occupiedSafetyNodes.has(nodeIndex),
               isContained: isContained
            });
         }
      }
   }

   return safetyNodesData;
}

const getTribePotentialBuildingPlans = (plan: BuildingPlan, chunkBounds: VisibleChunkBounds): ReadonlyArray<PotentialBuildingPlanData> => {
   const potentialPlansData = new Array<PotentialBuildingPlanData>();
   for (let i = 0; i < plan.potentialPlans.length; i++) {
      const potentialPlanData = plan.potentialPlans[i];
   
      // @Incomplete: filter out potential plans which aren't visible
      
      potentialPlansData.push(potentialPlanData);
   }

   return potentialPlansData;
}

export function getVisibleBuildingPlans(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<BuildingPlanData> {
   const buildingPlansData = new Array<BuildingPlanData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      for (let j = 0; j < tribe.buildingPlans.length; j++) {
         const plan = tribe.buildingPlans[j];

         let planPosition: Point;
         let planRotation: number;
         let entityType: EntityType;
         switch (plan.type) {
            case BuildingPlanType.newBuilding: {               
               planPosition = plan.position;
               planRotation = plan.rotation;
               entityType = (ITEM_INFO_RECORD[plan.buildingRecipe.product] as PlaceableItemInfo).entityType;
               break;
            }
            case BuildingPlanType.upgrade: {
               const building = plan.baseBuildingID;
               if (!Layer.hasEntity(building)) {
                  continue;
               }
               
               const buildingTransformComponent = TransformComponentArray.getComponent(building);
               
               planPosition = buildingTransformComponent.position;
               planRotation = plan.rotation;
               entityType = plan.entityType;
               break;
            }
         }
         
         // @Cleanup: hardcoded
         const minChunkX = Math.max(Math.floor((planPosition.x - 800) / Settings.CHUNK_UNITS), 0);
         const maxChunkX = Math.min(Math.floor((planPosition.x + 800) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
         const minChunkY = Math.max(Math.floor((planPosition.y - 800) / Settings.CHUNK_UNITS), 0);
         const maxChunkY = Math.min(Math.floor((planPosition.y + 800) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

         if (minChunkX <= chunkBounds[1] && maxChunkX >= chunkBounds[0] && minChunkY <= chunkBounds[3] && maxChunkY >= chunkBounds[2]) {
            buildingPlansData.push({
               x: planPosition.x,
               y: planPosition.y,
               rotation: planRotation,
               entityType: entityType,
               potentialBuildingPlans: getTribePotentialBuildingPlans(plan, chunkBounds),
               planNum: j + 1,
               assignedTribesmanID: plan.assignedTribesmanID
            });
         }
      }
   }

   return buildingPlansData;
}

export function getVisibleBuildingSafetys(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<BuildingSafetyData> {
   const buildingSafetysData = new Array<BuildingSafetyData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      for (let i = 0; i < tribe.buildings.length; i++) {
         const building = tribe.buildings[i];
         if (!buildingIsInfrastructure(building)) {
            continue;
         }
         // @Incomplete: filter out nodes which aren't in the chunk bounds

         // @Speed: Garbage collection
         const safetyInfo: PotentialPlanSafetyData = {
            buildingTypes: [],
            buildingIDs: [],
            buildingMinSafetys: [],
            buildingAverageSafetys: [],
            buildingExtendedAverageSafetys: [],
            buildingResultingSafetys: []
         };
         getBuildingSafety(tribe, building, safetyInfo);

         const buildingTransformComponent = TransformComponentArray.getComponent(building);

         buildingSafetysData.push({
            x: buildingTransformComponent.position.x,
            y: buildingTransformComponent.position.y,
            minSafety: safetyInfo.buildingMinSafetys[0],
            averageSafety: safetyInfo.buildingAverageSafetys[0],
            extendedAverageSafety: safetyInfo.buildingExtendedAverageSafetys[0],
            resultingSafety: safetyInfo.buildingResultingSafetys[0],
         });
      }
   }

   return buildingSafetysData;
}

export function getVisibleRestrictedBuildingAreas(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<RestrictedBuildingAreaData> {
   const restrictedAreasData = new Array<RestrictedBuildingAreaData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      for (let i = 0; i < tribe.restrictedBuildingAreas.length; i++) {
         const restrictedArea = tribe.restrictedBuildingAreas[i];

         // @Incomplete: filter out areas which aren't in the chunk bounds

         restrictedAreasData.push({
            x: restrictedArea.position.x,
            y: restrictedArea.position.y,
            rotation: restrictedArea.rotation,
            width: restrictedArea.width,
            height: restrictedArea.height
         });
      }
   }

   return restrictedAreasData;
}

const getWallSideNodeData = (nodeIndex: SafetyNode, side: number): WallSideNodeData => {
   return {
      nodeIndex: nodeIndex,
      side: side
   };
}

export function getVisibleWallsData(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<TribeWallData> {
   const wallDataArray = new Array<TribeWallData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      // @Incomplete: filter out areas which aren't in the chunk bounds
      for (const wallInfo of Object.values(tribe.wallInfoRecord)) {
         const topSideNodes = wallInfo.topSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 0));
         const rightSideNodes = wallInfo.rightSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 1));
         const bottomSideNodes = wallInfo.bottomSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 2));
         const leftSideNodes = wallInfo.leftSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 3));

         wallDataArray.push({
            wallID: wallInfo.wall.id,
            topSideNodes: topSideNodes,
            rightSideNodes: rightSideNodes,
            bottomSideNodes: bottomSideNodes,
            leftSideNodes: leftSideNodes
         });
      }
   }

   return wallDataArray;
}

export function getVisibleWallConnections(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<WallConnectionData> {
   const connectionsData = new Array<WallConnectionData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      for (let j = 0; j < tribe.virtualBuildings.length; j++) {
         const virtualBuilding = tribe.virtualBuildings[j];
         if (virtualBuilding.entityType !== EntityType.wall) {
            continue;
         }

         const wallInfo = tribe.wallInfoRecord[virtualBuilding.id];
      
         // @Incomplete: filter out nodes which aren't in the chunk bounds

         if (wallInfo.connectionBitset & 0b0001) {
            connectionsData.push({
               x: wallInfo.wall.position.x + 24 * Math.sin(wallInfo.wall.rotation),
               y: wallInfo.wall.position.y + 24 * Math.cos(wallInfo.wall.rotation),
               rotation: wallInfo.wall.rotation
            });
         }
         if (wallInfo.connectionBitset & 0b0010) {
            connectionsData.push({
               x: wallInfo.wall.position.x + 24 * Math.sin(wallInfo.wall.rotation + Math.PI/2),
               y: wallInfo.wall.position.y + 24 * Math.cos(wallInfo.wall.rotation + Math.PI/2),
               rotation: wallInfo.wall.rotation + Math.PI/2
            });
         }
         if (wallInfo.connectionBitset & 0b0100) {
            connectionsData.push({
               x: wallInfo.wall.position.x + 24 * Math.sin(wallInfo.wall.rotation + Math.PI),
               y: wallInfo.wall.position.y + 24 * Math.cos(wallInfo.wall.rotation + Math.PI),
               rotation: wallInfo.wall.rotation + Math.PI
            });
         }
         if (wallInfo.connectionBitset & 0b1000) {
            connectionsData.push({
               x: wallInfo.wall.position.x + 24 * Math.sin(wallInfo.wall.rotation + Math.PI*3/2),
               y: wallInfo.wall.position.y + 24 * Math.cos(wallInfo.wall.rotation + Math.PI*3/2),
               rotation: wallInfo.wall.rotation + Math.PI*3/2
            });
         }
      }
   }

   return connectionsData;
}