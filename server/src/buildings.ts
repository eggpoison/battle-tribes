import { EntityType } from "webgl-test-shared/dist/entities";
import { StructureType } from "webgl-test-shared/dist/structures";
import { createWallHitboxes } from "./entities/buildings/wall";
import CircularHitbox from "./hitboxes/CircularHitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import { createWorbenchHitboxes } from "./entities/workbench";
import { createDoorHitboxes } from "./entities/buildings/door";
import { createBarrelHitboxes } from "./entities/tribes/barrel";
import { createWorkerHutHitboxes } from "./entities/tribes/worker-hut";
import { createTribeTotemHitboxes } from "./entities/tribes/tribe-totem";
import { createWarriorHutHitboxes } from "./entities/tribes/warrior-hut";
import { createResearchBenchHitboxes } from "./entities/research-bench";
import { createBallistaHitboxes } from "./entities/buildings/ballista";
import { createSlingTurretHitboxes } from "./entities/buildings/sling-turret";
import { createTunnelHitboxes } from "./entities/buildings/tunnel";
import { createEmbrasureHitboxes } from "./entities/buildings/embrasure";
import { createFenceHitboxes } from "./entities/buildings/fence";
import { createFenceGateHitboxes } from "./entities/buildings/fence-gate";
import { createFloorSpikesHitboxes, createWallSpikesHitboxes } from "./entities/buildings/spikes";
import { createFloorPunjiSticksHitboxes, createWallPunjiSticksHitboxes } from "./entities/buildings/punji-sticks";
import { createHealingTotemHitboxes } from "./entities/buildings/healing-totem";
import { createPlanterBoxHitboxes } from "./entities/buildings/planter-box";
import { createFurnaceHitboxes } from "./entities/cooking-entities/furnace";
import { createCampfireHitboxes } from "./entities/cooking-entities/campfire";

// @Cleanup: If it's only the add hitboxes function in this file, move it to a different file and remove this file
export function createBuildingHitboxes(entityType: StructureType, parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   switch (entityType) {
      case EntityType.wall:             return createWallHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.workbench:        return createWorbenchHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.door:             return createDoorHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.tunnel:           return createTunnelHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.embrasure:        return createEmbrasureHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.barrel:           return createBarrelHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.workerHut:        return createWorkerHutHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.warriorHut:       return createWarriorHutHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.tribeTotem:       return createTribeTotemHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.researchBench:    return createResearchBenchHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.ballista:         return createBallistaHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.slingTurret:      return createSlingTurretHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.fence:            return createFenceHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.fenceGate:        return createFenceGateHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.floorSpikes:      return createFloorSpikesHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.wallSpikes:       return createWallSpikesHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.floorPunjiSticks: return createFloorPunjiSticksHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.wallPunjiSticks:  return createWallPunjiSticksHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.healingTotem:     return createHealingTotemHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.planterBox:       return createPlanterBoxHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.furnace:          return createFurnaceHitboxes(parentX, parentY, localID, parentRotation);
      case EntityType.campfire:         return createCampfireHitboxes(parentX, parentY, localID, parentRotation);
      default: {
         const _unreachable: never = entityType;
         return _unreachable;
      }
   }
}