import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import { TribeType, TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import Tribe from "../../Tribe";
import { HealthComponentArray, HutComponentArray, InventoryUseComponentArray, TribeComponentArray, TribesmanComponentArray } from "../../components/ComponentArray";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { HealthComponent } from "../../components/HealthComponent";
import { InventoryComponent, InventoryComponentArray } from "../../components/InventoryComponent";
import { InventoryUseComponent } from "../../components/InventoryUseComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeMemberComponent, TribeMemberComponentArray } from "../../components/TribeMemberComponent";
import { TribesmanComponent } from "../../components/TribesmanComponent";
import Board from "../../Board";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { tickTribesman } from "./tribesman-ai/tribesman-ai";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { TribeComponent } from "../../components/TribeComponent";

export const TRIBE_WORKER_RADIUS = 28;
export const TRIBE_WORKER_VISION_RANGE = 500;

const getTribeType = (workerPosition: Point): TribeType => {
   // @Temporary
   // return TribeType.barbarians;
   const tileX = Math.floor(workerPosition.x / Settings.TILE_SIZE);
   const tileY = Math.floor(workerPosition.y / Settings.TILE_SIZE);
   const tile = Board.getTile(tileX, tileY);

   if (Math.random() < 0.2) {
      return TribeType.goblins;
   }
   
   switch (tile.type) {
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

export function createTribeWorker(position: Point, rotation: number, tribeID: number, hutID: number): Entity {
   const worker = new Entity(position, rotation, EntityType.tribeWorker, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(position, 1, 0, 0, HitboxCollisionType.soft, TRIBE_WORKER_RADIUS, worker.getNextHitboxLocalID(), worker.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   worker.addHitbox(hitbox);
   
   let tribe: Tribe;
   if (tribeID !== -1) {
      tribe = Board.getTribe(tribeID);
   } else {
      // Establish its own tribe
      const tribeType = getTribeType(position);
      tribe = new Tribe(tribeType, true);
   }
   
   const tribeInfo = TRIBE_INFO_RECORD[tribe.type];
   PhysicsComponentArray.addComponent(worker.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(worker.id, new HealthComponent(tribeInfo.maxHealthWorker));
   StatusEffectComponentArray.addComponent(worker.id, new StatusEffectComponent(0));
   TribeComponentArray.addComponent(worker.id, new TribeComponent(tribe));
   TribeMemberComponentArray.addComponent(worker.id, new TribeMemberComponent(tribe.type, EntityType.tribeWorker));
   TribesmanComponentArray.addComponent(worker.id, new TribesmanComponent(hutID));
   AIHelperComponentArray.addComponent(worker.id, new AIHelperComponent(TRIBE_WORKER_VISION_RANGE));

   const inventoryUseComponent = new InventoryUseComponent();
   InventoryUseComponentArray.addComponent(worker.id, inventoryUseComponent);

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(worker.id, inventoryComponent);

   return worker;
}

export function tickTribeWorker(worker: Entity): void {
   tickTribesman(worker);
}

// @Cleanup: copy and paste
export function onTribeWorkerDeath(worker: Entity): void {
   // 
   // Attempt to respawn the tribesman when it is killed
   // 
   
   const tribesmanComponent = TribesmanComponentArray.getComponent(worker.id);

   // Only respawn the tribesman if their hut is alive
   if (typeof Board.entityRecord[tribesmanComponent.hutID] === "undefined") {
      return;
   }
   
   const hutComponent = HutComponentArray.getComponent(tribesmanComponent.hutID);
   if (hutComponent.isRecalling) {
      hutComponent.hasSpawnedTribesman = false;
   } else {
      const hut = Board.entityRecord[tribesmanComponent.hutID]!;
      
      const tribeComponent = TribeComponentArray.getComponent(worker.id);
      tribeComponent.tribe.respawnTribesman(hut);
   }
}