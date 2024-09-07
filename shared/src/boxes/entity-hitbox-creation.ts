import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../collision";
import { EntityType } from "../entities";
import { StructureType } from "../structures";
import { Point } from "../utils";
import { createHitbox, HitboxCollisionType, HitboxFlags, HitboxWrapper } from "./boxes";
import CircularBox from "./CircularBox";
import RectangularBox from "./RectangularBox";

export function createWallHitboxes(): ReadonlyArray<HitboxWrapper> {
   const WALL_SIZE = 64;

   const box = new RectangularBox(new Point(0, 0), WALL_SIZE, WALL_SIZE, 0);
   const hitbox = createHitbox(box, 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);

   return [hitbox];
}

export function createWarriorHutHitboxes(): ReadonlyArray<HitboxWrapper> {
   const WARRIOR_HUT_SIZE = 104;

   const box = new RectangularBox(new Point(0, 0), WARRIOR_HUT_SIZE, WARRIOR_HUT_SIZE, 0);
   const hitbox = createHitbox(box, 2,HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   
   return [hitbox];
}

// @Incomplete: local id
export function createTunnelHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_WIDTH = 8;
   const HITBOX_HEIGHT = 64;
   const THIN_HITBOX_WIDTH = 0.1;

   const hitboxes = new Array<HitboxWrapper>();
   
   // Soft hitboxes
   hitboxes.push(createHitbox(new RectangularBox(new Point(-32 + HITBOX_WIDTH / 2, 0), HITBOX_WIDTH, HITBOX_HEIGHT, 0), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0));
   hitboxes.push(createHitbox(new RectangularBox(new Point(32 - HITBOX_WIDTH / 2, 0), HITBOX_WIDTH, HITBOX_HEIGHT, 0), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0));

   // Hard hitboxes
   hitboxes.push(createHitbox(new RectangularBox(new Point(-32.5 + THIN_HITBOX_WIDTH, 0), THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0), 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0));
   hitboxes.push(createHitbox(new RectangularBox(new Point(32.5 - THIN_HITBOX_WIDTH, 0), THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0), 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0));

   return hitboxes;
}

export function createTribeTotemHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_SIZE = 120;
   
   const box = new CircularBox(new Point(0, 0), HITBOX_SIZE / 2);
   const hitbox = createHitbox(box, 2.2, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);

   return [hitbox];
}

export function createStonecarvingTableHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_WIDTH = 120;
   const HITBOX_HEIGHT = 80;

   const box = new RectangularBox(new Point(0, 0), HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   const hitbox = createHitbox(box, 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);

   return [hitbox];
}

export function createFloorSpikesHitboxes(): ReadonlyArray<HitboxWrapper> {
   const FLOOR_HITBOX_SIZE = 48;
   
   const box = new RectangularBox(new Point(0, 0), FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0);
   // @Hack mass
   const hitbox = createHitbox(box, Number.EPSILON, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING);

   return [hitbox];
}

export function createWallSpikesHitboxes(): ReadonlyArray<HitboxWrapper> {
   const WALL_HITBOX_WIDTH = 56;
   const WALL_HITBOX_HEIGHT = 28;

   const box = new RectangularBox(new Point(0, 0), WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0);
   // @Hack mass
   const hitbox = createHitbox(box, Number.EPSILON, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING);

   return [hitbox];
}

export function createSlingTurretHitboxes(): ReadonlyArray<HitboxWrapper> {
   const box = new CircularBox(new Point(0, 0), 40);
   const hitbox = createHitbox(box, 1.5, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createResearchBenchHitboxes(): ReadonlyArray<HitboxWrapper> {
   const box = new RectangularBox(new Point(0, 0), 128, 80, 0);
   const hitbox = createHitbox(box, 1.8, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createFloorPunjiSticksHitboxes(): ReadonlyArray<HitboxWrapper> {
   const FLOOR_HITBOX_SIZE = 48;

   const box = new RectangularBox(new Point(0, 0), FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0);
   // @Hack mass
   const hitbox = createHitbox(box, Number.EPSILON, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING);
   return [hitbox];
}

export function createWallPunjiSticksHitboxes(): ReadonlyArray<HitboxWrapper> {
   const WALL_HITBOX_WIDTH = 56;
   const WALL_HITBOX_HEIGHT = 32;

   const box = new RectangularBox(new Point(0, 0), WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0);
   // @Hack mass
   const hitbox = createHitbox(box, Number.EPSILON, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING);
   return [hitbox];
}

export function createPlanterBoxHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_SIZE = 80;

   const box = new RectangularBox(new Point(0, 0), HITBOX_SIZE, HITBOX_SIZE, 0);
   const hitbox = createHitbox(box, 1.5, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createHealingTotemHitboxes(): ReadonlyArray<HitboxWrapper> {
   const SIZE = 96;

   const box = new CircularBox(new Point(0, 0), SIZE / 2);
   const hitbox = createHitbox(box, 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createFrostshaperHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_WIDTH = 120;
   const HITBOX_HEIGHT = 80;

   const box = new RectangularBox(new Point(0, 0), HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   const hitbox = createHitbox(box, 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING);
   return [hitbox];
}

export function createFenceHitboxes(): ReadonlyArray<HitboxWrapper> {
   const NODE_HITBOX_WIDTH = 20;
   const NODE_HITBOX_HEIGHT = 20;
   
   const box = new RectangularBox(new Point(0, 0), NODE_HITBOX_WIDTH, NODE_HITBOX_HEIGHT, 0);
   const hitbox = createHitbox(box, 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createFenceGateHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_WIDTH = 56;
   const HITBOX_HEIGHT = 16;

   const box = new RectangularBox(new Point(0, 0), HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   const hitbox = createHitbox(box, 1, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING);
   return [hitbox];
}

export function createEmbrasureHitboxes(): ReadonlyArray<HitboxWrapper> {
   const VERTICAL_HITBOX_WIDTH = 12;
   const VERTICAL_HITBOX_HEIGHT = 20;
   
   const HORIZONTAL_HITBOX_WIDTH = 24;
   const HORIZONTAL_HITBOX_HEIGHT = 16;

   const hitboxes = new Array<HitboxWrapper>();
   
   // Add the two vertical hitboxes (can stop arrows)
   hitboxes.push(createHitbox(new RectangularBox(new Point(-(64 - VERTICAL_HITBOX_WIDTH) / 2 + 0.025, 0), VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT, 0), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0));
   hitboxes.push(createHitbox(new RectangularBox(new Point((64 - VERTICAL_HITBOX_WIDTH) / 2 - 0.025, 0), VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT, 0), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0));

   // Add the two horizontal hitboxes (cannot stop arrows)
   hitboxes.push(createHitbox(new RectangularBox(new Point(-(64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT, 0), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, 0));
   hitboxes.push(createHitbox(new RectangularBox(new Point((64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT, 0), 0.4, HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, 0));

   return hitboxes;
}

export function createDoorHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_WIDTH = 64;
   const HITBOX_HEIGHT = 16;

   const box = new RectangularBox(new Point(0, 0), HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   const hitbox = createHitbox(box, 0.5, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createBarrelHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_SIZE = 80;

   const box = new CircularBox(new Point(0, 0), HITBOX_SIZE / 2);
   const hitbox = createHitbox(box, 1.5, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createBallistaHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_SIZE = 100;

   const box = new RectangularBox(new Point(0, 0), HITBOX_SIZE, HITBOX_SIZE, 0);
   const hitbox = createHitbox(box, 2, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createWorkbenchHitboxes(): ReadonlyArray<HitboxWrapper> {

   const hitboxes = new Array<HitboxWrapper>();
   hitboxes.push(createHitbox(new RectangularBox(new Point(0, 0), 72, 80, 0), 1.6, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0));
   hitboxes.push(createHitbox(new RectangularBox(new Point(0, 0), 80, 72, 0), 1.6, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0));
   return hitboxes;
}

export function createWorkerHutHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_SIZE = 88;

   const box = new RectangularBox(new Point(0, 0), HITBOX_SIZE, HITBOX_SIZE, 0);
   const hitbox = createHitbox(box, 1.8, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createFurnaceHitboxes(): ReadonlyArray<HitboxWrapper> {
   const HITBOX_SIZE = 80;
   
   const box = new RectangularBox(new Point(0, 0), HITBOX_SIZE, HITBOX_SIZE, 0);
   const hitbox = createHitbox(box, 2, HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   return [hitbox];
}

export function createCampfireHitboxes(): ReadonlyArray<HitboxWrapper> {
   const CAMPFIRE_SIZE = 104;

   const box = new CircularBox(new Point(0, 0), CAMPFIRE_SIZE / 2);
   const hitbox = createHitbox(box, 2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING);
   return [hitbox];
}


/*
Generic creation functions
*/

// @Incomplete: Include all entity types not just structures
export function createEntityHitboxes(entityType: StructureType): ReadonlyArray<HitboxWrapper> {
   switch (entityType) {
      case EntityType.wall:              return createWallHitboxes();
      case EntityType.workbench:         return createWorkbenchHitboxes();
      case EntityType.door:              return createDoorHitboxes();
      case EntityType.tunnel:            return createTunnelHitboxes();
      case EntityType.embrasure:         return createEmbrasureHitboxes();
      case EntityType.barrel:            return createBarrelHitboxes();
      case EntityType.workerHut:         return createWorkerHutHitboxes();
      case EntityType.warriorHut:        return createWarriorHutHitboxes();
      case EntityType.tribeTotem:        return createTribeTotemHitboxes();
      case EntityType.researchBench:     return createResearchBenchHitboxes();
      case EntityType.ballista:          return createBallistaHitboxes();
      case EntityType.slingTurret:       return createSlingTurretHitboxes();
      case EntityType.fence:             return createFenceHitboxes();
      case EntityType.fenceGate:         return createFenceGateHitboxes();
      case EntityType.floorSpikes:       return createFloorSpikesHitboxes();
      case EntityType.wallSpikes:        return createWallSpikesHitboxes();
      case EntityType.floorPunjiSticks:  return createFloorPunjiSticksHitboxes();
      case EntityType.wallPunjiSticks:   return createWallPunjiSticksHitboxes();
      case EntityType.healingTotem:      return createHealingTotemHitboxes();
      case EntityType.planterBox:        return createPlanterBoxHitboxes();
      case EntityType.furnace:           return createFurnaceHitboxes();
      case EntityType.campfire:          return createCampfireHitboxes();
      case EntityType.frostshaper:       return createFrostshaperHitboxes();
      case EntityType.stonecarvingTable: return createStonecarvingTableHitboxes();
      default: {
         const unreachable: never = entityType;
         return unreachable;
      }
   }
}