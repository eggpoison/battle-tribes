import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { TribeType } from "battletribes-shared/tribes";
import { Point, randInt } from "battletribes-shared/utils";
import Tribe from "../../Tribe";
import { TribesmanAIComponentArray } from "../../components/TribesmanAIComponent";
import Layer from "../../Layer";
import { TribeComponentArray } from "../../components/TribeComponent";
import { HutComponentArray } from "../../components/HutComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { entityExists, getTribe } from "../../world";

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

const getTribeType = (layer: Layer, workerPosition: Point): TribeType => {
   if (Math.random() < 0.2) {
      return TribeType.goblins;
   }
   
   const tileX = Math.floor(workerPosition.x / Settings.TILE_SIZE);
   const tileY = Math.floor(workerPosition.y / Settings.TILE_SIZE);
   const tileType = layer.getTileType(tileX, tileY);
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
const findTribe = (tribeID: number, layer: Layer, position: Point): Tribe => {
   if (tribeID !== -1) {
      const tribe = getTribe(tribeID);
      if (tribe !== null) {
         return tribe;
      }
   }

   // Fallback: establish its own tribe
   const tribeType = getTribeType(layer, position);
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
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, TRIBE_WORKER_RADIUS), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
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
   if (!entityExists(tribesmanComponent.hutID)) {
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