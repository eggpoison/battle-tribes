import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../collision";
import { EntityType } from "../entities";
import { StructureType } from "../structures";
import { Point } from "../utils";
import { Hitbox, RectangularHitbox, HitboxCollisionType, CircularHitbox, HitboxFlags } from "./hitboxes";

export function createWallHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const WALL_SIZE = 64 - 0.05;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, WALL_SIZE, WALL_SIZE, 0));
   return hitboxes;
}

export function createWarriorHutHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const WARRIOR_HUT_SIZE = 104 - 0.05;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(2, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, WARRIOR_HUT_SIZE, WARRIOR_HUT_SIZE, 0));
   return hitboxes;
}

// @Incomplete: local id
export function createTunnelHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 8 - 0.05;
   const HITBOX_HEIGHT = 64 - 0.05;
   const THIN_HITBOX_WIDTH = 0.1;

   const hitboxes = new Array<Hitbox>();
   
   // Soft hitboxes
   hitboxes.push(new RectangularHitbox(1, new Point(-32 + HITBOX_WIDTH / 2, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(1, new Point(32 - HITBOX_WIDTH / 2, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_WIDTH, HITBOX_HEIGHT, 0));

   // Hard hitboxes
   // entity.addHitbox(new RectangularHitbox(entity, 1, -32 + THIN_HITBOX_WIDTH, 0, HitboxCollisionType.hard, THIN_HITBOX_WIDTH, HITBOX_HEIGHT));
   // entity.addHitbox(new RectangularHitbox(entity, 1, 32 - THIN_HITBOX_WIDTH, 0, HitboxCollisionType.hard, THIN_HITBOX_WIDTH, HITBOX_HEIGHT));
   // @Temporary
   hitboxes.push(new RectangularHitbox(1, new Point(-32.5, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(1, new Point(32.5, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0));

   return hitboxes;
}

export function createTribeTotemHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 120;
   
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(2.2, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE / 2));
   return hitboxes;
}

export function createStonecarvingTableHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 120 - 0.05;
   const HITBOX_HEIGHT = 80 - 0.05;

   const hitboxes = new Array<Hitbox>();

   const hitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);

   return hitboxes;
}

export function createFloorSpikesHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const FLOOR_HITBOX_SIZE = 48 - 0.05;
   const hitboxes = new Array<Hitbox>();
   
   // @Hack mass
   const hitbox = new RectangularHitbox(Number.EPSILON, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, HitboxFlags.NON_GRASS_BLOCKING, FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createWallSpikesHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const WALL_HITBOX_WIDTH = 56 - 0.05;
   const WALL_HITBOX_HEIGHT = 28 - 0.05;

   const hitboxes = new Array<Hitbox>();

   // @Hack mass
   const hitbox = new RectangularHitbox(Number.EPSILON, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, HitboxFlags.NON_GRASS_BLOCKING, WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createSlingTurretHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(1.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, 40 - 0.05));
   return hitboxes;
}

export function createResearchBenchHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.8, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, 128, 80, 0));
   return hitboxes;
}

export function createFloorPunjiSticksHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const FLOOR_HITBOX_SIZE = 48 - 0.05;

   const hitboxes = new Array<Hitbox>();
   
   // @Hack mass
   const hitbox = new RectangularHitbox(Number.EPSILON, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, HitboxFlags.NON_GRASS_BLOCKING, FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createWallPunjiSticksHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const WALL_HITBOX_WIDTH = 56 - 0.05;
   const WALL_HITBOX_HEIGHT = 32 - 0.05;

   const hitboxes = new Array<Hitbox>();

   // @Hack mass
   const hitbox = new RectangularHitbox(Number.EPSILON, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, HitboxFlags.NON_GRASS_BLOCKING, WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createPlanterBoxHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 80 - 0.05;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createHealingTotemHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const SIZE = 96 - 0.05;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, SIZE / 2));
   return hitboxes;
}

export function createFrostshaperHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 120 - 0.05;
   const HITBOX_HEIGHT = 80 - 0.05;

   const hitboxes = new Array<Hitbox>();

   const hitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, HitboxFlags.NON_GRASS_BLOCKING, HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);

   return hitboxes;
}

export function createFenceHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const NODE_HITBOX_WIDTH = 20 - 0.05;
   const NODE_HITBOX_HEIGHT = 20 - 0.05;
   
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, NODE_HITBOX_WIDTH, NODE_HITBOX_HEIGHT, 0));
   return hitboxes;
}

export function createFenceGateHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 56 - 0.05;
   const HITBOX_HEIGHT = 16 - 0.05;

   const hitboxes = new Array<Hitbox>();

   const hitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, HitboxFlags.NON_GRASS_BLOCKING, HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createEmbrasureHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const VERTICAL_HITBOX_WIDTH = 12 - 0.05;
   const VERTICAL_HITBOX_HEIGHT = 20 - 0.05;
   
   const HORIZONTAL_HITBOX_WIDTH = 24 - 0.05;
   const HORIZONTAL_HITBOX_HEIGHT = 16 - 0.05;

   const hitboxes = new Array<Hitbox>();
   
   // Add the two vertical hitboxes (can stop arrows)
   hitboxes.push(new RectangularHitbox(0.4, new Point(-(64 - VERTICAL_HITBOX_WIDTH) / 2 + 0.025, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(0.4, new Point((64 - VERTICAL_HITBOX_WIDTH) / 2 - 0.025, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT, 0));

   // Add the two horizontal hitboxes (cannot stop arrows)
   hitboxes.push(new RectangularHitbox(0.4, new Point(-(64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(0.4, new Point((64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), HitboxCollisionType.hard, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT, 0));

   return hitboxes;
}

export function createDoorHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_WIDTH = 64 - 0.05;
   const HITBOX_HEIGHT = 16 - 0.05;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(0.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   return hitboxes;
}

export function createBarrelHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 80 - 0.05;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(1.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE / 2));
   return hitboxes;
}

export function createBallistaHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 100 - 0.05;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(2, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createWorbenchHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 80;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.6, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createWorkerHutHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 88;

   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.8, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createFurnaceHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const HITBOX_SIZE = 80;
   
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(2, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createCampfireHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const CAMPFIRE_SIZE = 104;

   const hitboxes = new Array<Hitbox>();
   
   const hitbox = new CircularHitbox(2, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, HitboxFlags.NON_GRASS_BLOCKING, CAMPFIRE_SIZE / 2);
   hitboxes.push(hitbox);

   return hitboxes;
}


/*
Generic creation functions
*/

// @Incomplete: Include all entity types not just structures
export function createEntityHitboxes(entityType: StructureType, localID: number): ReadonlyArray<Hitbox> {
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