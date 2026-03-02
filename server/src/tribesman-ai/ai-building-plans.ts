import { EntityType } from "battletribes-shared/entities";
import Tribe from "../Tribe";
import { updateBuildingLayer } from "./ai-building";
import { getBuildingSafety, getTribeSafety } from "./ai-building-heuristics";
import { createVirtualStructure, VirtualStructure } from "./building-plans/TribeBuildingLayer";
import { getWallCandidates } from "./building-plans/ai-building-walls";
import { PotentialPlanSafetyData } from "../../../shared/src/ai-building-types";

export interface WallPlaceSearchResult {
   readonly virtualBuilding: VirtualStructure;
   readonly potentialPlans: ReadonlyArray<WallPlaceCandidate>;
}

export interface WallPlaceCandidate {
   readonly virtualBuilding: VirtualStructure;
   /** Resulting safety of the tribe */
   readonly safety: number;
}

export function findIdealWallPlacePosition(tribe: Tribe): WallPlaceSearchResult | null {
   const potentialCandidates = getWallCandidates(tribe);
   if (potentialCandidates.length === 0) {
      // Unable to find a position
      return null;
   }

   const potentialPlans = new Array<WallPlaceCandidate>();

   // 
   // Simulate placing each building to see which one increases safety the most
   // 

   let maxSafety = -1;
   let bestBuilding!: VirtualStructure;
   for (let i = 0; i < potentialCandidates.length; i++) {
      const candidate = potentialCandidates[i];

      const virtualBuilding = createVirtualStructure(candidate.buildingLayer, candidate.position, candidate.rotation, EntityType.wall);

      // Simulate placing the wall
      candidate.buildingLayer.addVirtualBuilding(virtualBuilding);
      updateBuildingLayer(candidate.buildingLayer);

      const query = getTribeSafety(tribe);
      
      const safety = query.safety;
      if (safety > maxSafety) {
         maxSafety = safety;
         bestBuilding = virtualBuilding;
      }

      potentialPlans.push({
         virtualBuilding: virtualBuilding,
         safety: safety
      });

      // Undo the simulated placement
      candidate.buildingLayer.removeVirtualBuilding(virtualBuilding);
      updateBuildingLayer(candidate.buildingLayer);
   }

   return {
      virtualBuilding: bestBuilding,
      potentialPlans: potentialPlans
   };
}

// @Incomplete
// export function forceBuildPlans(tribe: Tribe): void {
//    for (let i = 0; i < tribe.buildingPlans.length; i++) {
//       const plan = tribe.buildingPlans[i];

//       switch (plan.type) {
//          case BuildingPlanType.newBuilding: {
//             const entityType = (ITEM_INFO_RECORD[plan.buildingRecipe.product] as PlaceableItemInfo).entityType;
//             const connectionInfo = calculateStructureConnectionInfo(plan.position, plan.rotation, entityType, getLayerInfo(plan.layer));

//             placeBuilding(tribe, plan.layer, plan.position, plan.rotation, entityType, connectionInfo, []);
//             break;
//          }
//       }
//    }
// }