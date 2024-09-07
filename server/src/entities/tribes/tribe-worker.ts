import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import { TribesmanAIComponentArray } from "../../components/TribesmanAIComponent";
import Board from "../../Board";
import { TribeComponentArray } from "../../components/TribeComponent";
import { HutComponentArray } from "../../components/HutComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import CircularBox from "webgl-test-shared/dist/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "webgl-test-shared/dist/boxes/boxes";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tribe
   | ServerComponentType.tribeMember
   | ServerComponentType.tribesmanAI
   | ServerComponentType.aiHelper
   | ServerComponentType.inventoryUse
   | ServerComponentType.inventory;

export const TRIBE_WORKER_RADIUS = 28;
export const TRIBE_WORKER_VISION_RANGE = 500;

const getTribeType = (workerPosition: Point): TribeType => {
   if (Math.random() < 0.2) {
      return TribeType.goblins;
   }
   
   const tileX = Math.floor(workerPosition.x / Settings.TILE_SIZE);
   const tileY = Math.floor(workerPosition.y / Settings.TILE_SIZE);
   const tileType = Board.getTileType(tileX, tileY);
   switch (tileType) {
      case TileType.grass: {
         return TribeType.plainspeople;
      }
      case TileType.sand: {
         return TribeType.barbarians;
      }
      case TileType.snow:
      case TileType.ice: {
         return TribeType.frostlings;
      }
      case TileType.rock: {
         return TribeType.goblins;
      }
      default: {
         return randInt(0, 3);
      }
   }
}

// @Cleanup: unused?
const findTribe = (tribeID: number, position: Point): Tribe => {
   if (tribeID !== -1) {
      const tribe = Board.getTribeExpected(tribeID);
      if (tribe !== null) {
         return tribe;
      }
   }

   // Fallback: establish its own tribe
   const tribeType = getTribeType(position);
   return new Tribe(tribeType, true);
}

export function createTribeWorkerConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.tribeWorker,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), TRIBE_WORKER_RADIUS), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.tribeMember]: {
         tribeType: TribeType.plainspeople,
         entityType: EntityType.tribeWorker
      },
      [ServerComponentType.tribesmanAI]: {
         hut: 0
      },
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: TRIBE_WORKER_VISION_RANGE
      },
      [ServerComponentType.inventory]: {
         inventories: []
      },
      [ServerComponentType.inventoryUse]: {
         usedInventoryNames: []
      }
   };
}

// @Cleanup: copy and paste
export function onTribeWorkerDeath(worker: EntityID): void {
   // 
   // Attempt to respawn the tribesman when it is killed
   // 
   
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(worker);

   // Only respawn the tribesman if their hut is alive
   if (!Board.hasEntity(tribesmanComponent.hutID)) {
      return;
   }
   
   const hutComponent = HutComponentArray.getComponent(tribesmanComponent.hutID);
   if (hutComponent.isRecalling) {
      hutComponent.hasSpawnedTribesman = false;
   } else {
      const tribeComponent = TribeComponentArray.getComponent(worker);
      tribeComponent.tribe.respawnTribesman(tribesmanComponent.hutID);
   }
}