import { assert, Point } from "battletribes-shared/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { cleanupEntityRendering, renderEntity, setupEntityRendering } from "./entity-rendering";
import { gl } from "../../webgl";

// @Cleanup @Robustness: a lot of these are just mirrors of entity textures. Is there some way to utilise the existing render part definitions?
export enum GhostType {
   deconstructMarker,
   recallMarker,
   coverLeaves,
   treeSeed,
   berryBushSeed,
   iceSpikesSeed,
   fertiliser,
   campfire,
   furnace,
   tribeTotem,
   workbench,
   barrel,
   workerHut,
   warriorHut,
   researchBench,
   planterBox,
   woodenFloorSpikes,
   woodenWallSpikes,
   floorPunjiSticks,
   wallPunjiSticks,
   woodenDoor,
   stoneDoor,
   stoneDoorUpgrade,
   woodenEmbrasure,
   stoneEmbrasure,
   stoneEmbrasureUpgrade,
   woodenWall,
   stoneWall,
   woodenTunnel,
   stoneTunnel,
   stoneTunnelUpgrade,
   tunnelDoor,
   ballista,
   slingTurret,
   stoneFloorSpikes,
   stoneWallSpikes,
   healingTotem,
   fence,
   fenceGate,
   frostshaper,
   stonecarvingTable,
   stoneBracings
}

export interface GhostInfo {
   readonly position: Readonly<Point>;
   readonly rotation: number;
   readonly ghostType: GhostType;
   readonly tint: [number, number, number];
   readonly opacity: number;
}

export const PARTIAL_OPACITY = 0.5;

const renderInfos = new Array<EntityRenderInfo>();

export function addGhostRenderInfo(renderInfo: EntityRenderInfo): void {
   const idx = renderInfos.indexOf(renderInfo);
   if (idx === -1) {
      renderInfos.push(renderInfo);
   }
}

export function removeGhostRenderInfo(renderInfo: EntityRenderInfo): void {
   const idx = renderInfos.indexOf(renderInfo);
   assert(idx !== -1);
   renderInfos.splice(idx, 1);
}

export function renderGhostEntities(): void {
   // @INCOMPLETE
   // // Building plans
   // if (OPTIONS.showBuildingPlans) {
   //    const buildingPlans = getVisibleBuildingPlans();
   //    for (let i = 0; i < buildingPlans.length; i++) {
   //       const plan = buildingPlans[i];
         
   //       ghostInfos.push({
   //          position: new Point(plan.x, plan.y),
   //          rotation: plan.rotation,
   //          ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[plan.entityType],
   //          opacity: 0.5,
   //          tint: [0.9, 1.5, 0.8]
   //       });
   //    }

   //    // Potential building plans
   //    const hoveredBuildingPlan = getHoveredBuildingPlan();
   //    if (hoveredBuildingPlan !== null && hoveredBuildingPlan.potentialBuildingPlans.length > 0) {
   //       const plan = hoveredBuildingPlan;
   
   //       const firstPlan = plan.potentialBuildingPlans[0];
   //       let minPlanSafety = firstPlan.safety;
   //       let maxPlanSafety = firstPlan.safety;
   //       for (let i = 1; i < plan.potentialBuildingPlans.length; i++) {
   //          const potentialPlan = plan.potentialBuildingPlans[i];
   //          if (potentialPlan.safety < minPlanSafety) {
   //             minPlanSafety = potentialPlan.safety;
   //          } else if (potentialPlan.safety > maxPlanSafety) {
   //             maxPlanSafety = potentialPlan.safety;
   //          }
   //       }
   
   //       const potentialPlans = plan.potentialBuildingPlans;
   //       const stats = getPotentialPlanStats(potentialPlans);
   //       for (let i = 0; i < plan.potentialBuildingPlans.length; i++) {
   //          const potentialPlan = plan.potentialBuildingPlans[i];
   
   //          const idealness = calculatePotentialPlanIdealness(potentialPlan, stats);
   
   //          ghostInfos.push({
   //             position: new Point(potentialPlan.x, potentialPlan.y),q
   //             rotation: potentialPlan.rotation,
   //             ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[potentialPlan.buildingType],
   //             opacity: lerp(0.15, 0.6, idealness),
   //             tint: [1.2, 1.4, 0.8]
   //          });
   //       }
   //    }
   // }

   if (renderInfos.length === 0) {
      return;
   }

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

   setupEntityRendering();
   for (const renderInfo of renderInfos) {
      renderEntity(renderInfo);
   }
   cleanupEntityRendering();

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}