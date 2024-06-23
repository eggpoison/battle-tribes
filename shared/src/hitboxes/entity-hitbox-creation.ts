import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../collision";
import { EntityType } from "../entities";
import { StructureType } from "../structures";
import { Point } from "../utils";
import { Hitbox, RectangularHitbox, HitboxCollisionType, CircularHitbox, HitboxFlags } from "./hitboxes";

export function createWallHitboxes(): ReadonlyArray<Hitbox> {
   const WALL_SIZE = 64;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, WALL_SIZE, WALL_SIZE, 0));
   return hitboxes;
}

export function createWarriorHutHitboxes(): ReadonlyArray<Hitbox> {
   const WARRIOR_HUT_SIZE = 104;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(2, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, WARRIOR_HUT_SIZE, WARRIOR_HUT_SIZE, 0));
   return hitboxes;
}

// @Incomplete: local id
export function createTunnelHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 8;
   const HITBOX_HEIGHT = 64;
   const THIN_HITBOX_WIDTH = 0.1;

   const hitboxes = new Array<Hitbox>();
   
   // Soft hitboxes
   hitboxes.push(new RectangularHitbox(1, new Point(-32 + HITBOX_WIDTH / 2, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(1, new Point(32 - HITBOX_WIDTH / 2, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_WIDTH, HITBOX_HEIGHT, 0));

   // Hard hitboxes
   hitboxes.push(new RectangularHitbox(1, new Point(-32.5 + THIN_HITBOX_WIDTH, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(1, new Point(32.5 - THIN_HITBOX_WIDTH, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0));

   return hitboxes;
}

export function createTribeTotemHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 120;
   
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(2.2, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_SIZE / 2));
   return hitboxes;
}

export function createStonecarvingTableHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 120;
   const HITBOX_HEIGHT = 80;

   const hitboxes = new Array<Hitbox>();

   const hitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);

   return hitboxes;
}

export function createFloorSpikesHitboxes(): ReadonlyArray<Hitbox> {
   const FLOOR_HITBOX_SIZE = 48;
   const hitboxes = new Array<Hitbox>();
   
   // @Hack mass
   const hitbox = new RectangularHitbox(Number.EPSILON, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING, FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createWallSpikesHitboxes(): ReadonlyArray<Hitbox> {
   const WALL_HITBOX_WIDTH = 56;
   const WALL_HITBOX_HEIGHT = 28;

   const hitboxes = new Array<Hitbox>();

   // @Hack mass
   const hitbox = new RectangularHitbox(Number.EPSILON, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING, WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createSlingTurretHitboxes(): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(1.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 40));
   return hitboxes;
}

export function createResearchBenchHitboxes(): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.8, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 128, 80, 0));
   return hitboxes;
}

export function createFloorPunjiSticksHitboxes(): ReadonlyArray<Hitbox> {
   const FLOOR_HITBOX_SIZE = 48;

   const hitboxes = new Array<Hitbox>();
   
   // @Hack mass
   const hitbox = new RectangularHitbox(Number.EPSILON, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING, FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createWallPunjiSticksHitboxes(): ReadonlyArray<Hitbox> {
   const WALL_HITBOX_WIDTH = 56;
   const WALL_HITBOX_HEIGHT = 32;

   const hitboxes = new Array<Hitbox>();

   // @Hack mass
   const hitbox = new RectangularHitbox(Number.EPSILON, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING, WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createPlanterBoxHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 80;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createHealingTotemHitboxes(): ReadonlyArray<Hitbox> {
   const SIZE = 96;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, SIZE / 2));
   return hitboxes;
}

export function createFrostshaperHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 120;
   const HITBOX_HEIGHT = 80;

   const hitboxes = new Array<Hitbox>();

   const hitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING, HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);

   return hitboxes;
}

export function createFenceHitboxes(): ReadonlyArray<Hitbox> {
   const NODE_HITBOX_WIDTH = 20;
   const NODE_HITBOX_HEIGHT = 20;
   
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, NODE_HITBOX_WIDTH, NODE_HITBOX_HEIGHT, 0));
   return hitboxes;
}

export function createFenceGateHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 56;
   const HITBOX_HEIGHT = 16;

   const hitboxes = new Array<Hitbox>();

   const hitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING, HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createEmbrasureHitboxes(): ReadonlyArray<Hitbox> {
   const VERTICAL_HITBOX_WIDTH = 12;
   const VERTICAL_HITBOX_HEIGHT = 20;
   
   const HORIZONTAL_HITBOX_WIDTH = 24;
   const HORIZONTAL_HITBOX_HEIGHT = 16;

   const hitboxes = new Array<Hitbox>();
   
   // Add the two vertical hitboxes (can stop arrows)
   hitboxes.push(new RectangularHitbox(0.4, new Point(-(64 - VERTICAL_HITBOX_WIDTH) / 2 + 0.025, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(0.4, new Point((64 - VERTICAL_HITBOX_WIDTH) / 2 - 0.025, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT, 0));

   // Add the two horizontal hitboxes (cannot stop arrows)
   hitboxes.push(new RectangularHitbox(0.4, new Point(-(64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, 0, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(0.4, new Point((64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, 0, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT, 0));

   return hitboxes;
}

export function createDoorHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 64;
   const HITBOX_HEIGHT = 16;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(0.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   return hitboxes;
}

export function createBarrelHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 80;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(1.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_SIZE / 2));
   return hitboxes;
}

export function createBallistaHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 100;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(2, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createWorkbenchHitboxes(): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.6, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 72, 80, 0));
   hitboxes.push(new RectangularHitbox(1.6, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 80, 72, 0));
   return hitboxes;
}

export function createWorkerHutHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 88;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.8, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createFurnaceHitboxes(): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 80;
   
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(2, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createCampfireHitboxes(): ReadonlyArray<Hitbox> {
   const CAMPFIRE_SIZE = 104;

   const hitboxes = new Array<Hitbox>();
   
   const hitbox = new CircularHitbox(2, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, HitboxFlags.NON_GRASS_BLOCKING, CAMPFIRE_SIZE / 2);
   hitboxes.push(hitbox);

   return hitboxes;
}


/*
Generic creation functions
*/

// @Incomplete: Include all entity types not just structures
export function createEntityHitboxes(entityType: StructureType): ReadonlyArray<Hitbox> {
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