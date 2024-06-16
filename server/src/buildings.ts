import { EntityType } from "webgl-test-shared/dist/entities";
import { StructureType } from "webgl-test-shared/dist/structures";
import { createWallHitboxes } from "./entities/structures/wall";
import { createWorbenchHitboxes } from "./entities/structures/workbench";
import { createDoorHitboxes } from "./entities/structures/door";
import { createBarrelHitboxes } from "./entities/structures/barrel";
import { createWorkerHutHitboxes } from "./entities/structures/worker-hut";
import { createTribeTotemHitboxes } from "./entities/structures/tribe-totem";
import { createWarriorHutHitboxes } from "./entities/structures/warrior-hut";
import { createResearchBenchHitboxes } from "./entities/structures/research-bench";
import { createBallistaHitboxes } from "./entities/structures/ballista";
import { createSlingTurretHitboxes } from "./entities/structures/sling-turret";
import { createTunnelHitboxes } from "./entities/structures/tunnel";
import { createEmbrasureHitboxes } from "./entities/structures/embrasure";
import { createFenceHitboxes } from "./entities/structures/fence";
import { createFenceGateHitboxes } from "./entities/structures/fence-gate";
import { createFloorSpikesHitboxes, createWallSpikesHitboxes } from "./entities/structures/spikes";
import { createFloorPunjiSticksHitboxes, createWallPunjiSticksHitboxes } from "./entities/structures/punji-sticks";
import { createHealingTotemHitboxes } from "./entities/structures/healing-totem";
import { createPlanterBoxHitboxes } from "./entities/structures/planter-box";
import { createFurnaceHitboxes } from "./entities/cooking-entities/furnace";
import { createCampfireHitboxes } from "./entities/cooking-entities/campfire";
import { createFrostshaperHitboxes } from "./entities/structures/frostshaper";
import { createStonecarvingTableHitboxes } from "./entities/structures/stonecarving-table";
import { Hitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

// @Cleanup: If it's only the add hitboxes function in this file, move it to a different file and remove this file
export function createBuildingHitboxes(entityType: StructureType, localID: number): ReadonlyArray<Hitbox> {
   switch (entityType) {
      case EntityType.wall:              return createWallHitboxes(localID);
      case EntityType.workbench:         return createWorbenchHitboxes(localID);
      case EntityType.door:              return createDoorHitboxes(localID);
      case EntityType.tunnel:            return createTunnelHitboxes(localID);
      case EntityType.embrasure:         return createEmbrasureHitboxes(localID);
      case EntityType.barrel:            return createBarrelHitboxes(localID);
      case EntityType.workerHut:         return createWorkerHutHitboxes(localID);
      case EntityType.warriorHut:        return createWarriorHutHitboxes(localID);
      case EntityType.tribeTotem:        return createTribeTotemHitboxes(localID);
      case EntityType.researchBench:     return createResearchBenchHitboxes(localID);
      case EntityType.ballista:          return createBallistaHitboxes(localID);
      case EntityType.slingTurret:       return createSlingTurretHitboxes(localID);
      case EntityType.fence:             return createFenceHitboxes(localID);
      case EntityType.fenceGate:         return createFenceGateHitboxes(localID);
      case EntityType.floorSpikes:       return createFloorSpikesHitboxes(localID);
      case EntityType.wallSpikes:        return createWallSpikesHitboxes(localID);
      case EntityType.floorPunjiSticks:  return createFloorPunjiSticksHitboxes(localID);
      case EntityType.wallPunjiSticks:   return createWallPunjiSticksHitboxes(localID);
      case EntityType.healingTotem:      return createHealingTotemHitboxes(localID);
      case EntityType.planterBox:        return createPlanterBoxHitboxes(localID);
      case EntityType.furnace:           return createFurnaceHitboxes(localID);
      case EntityType.campfire:          return createCampfireHitboxes(localID);
      case EntityType.frostshaper:       return createFrostshaperHitboxes(localID);
      case EntityType.stonecarvingTable: return createStonecarvingTableHitboxes(localID);
      default: {
         const unreachable: never = entityType;
         return unreachable;
      }
   }
}