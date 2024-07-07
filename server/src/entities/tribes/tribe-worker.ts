import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import { TribeType, TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import Tribe from "../../Tribe";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { InventoryComponent, InventoryComponentArray } from "../../components/InventoryComponent";
import { InventoryUseComponent, InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeMemberComponent, TribeMemberComponentArray } from "../../components/TribeMemberComponent";
import { TribesmanAIComponent, TribesmanAIComponentArray } from "../../components/TribesmanAIComponent";
import Board from "../../Board";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { tickTribesman } from "./tribesman-ai/tribesman-ai";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { HutComponentArray } from "../../components/HutComponent";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentRecord, EntityCreationInfo } from "../../components";

type ComponentTypes = [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.tribesmanAI, ServerComponentType.aiHelper, ServerComponentType.inventoryUse, ServerComponentType.inventory];

export const TRIBE_WORKER_RADIUS = 28;
export const TRIBE_WORKER_VISION_RANGE = 500;

const getTribeType = (workerPosition: Point): TribeType => {
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

export function createTribeWorker(position: Point, rotation: number, tribeID: number, hutID: number): EntityCreationInfo<ComponentTypes> {
   const worker = new Entity(position, rotation, EntityType.tribeWorker, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, TRIBE_WORKER_RADIUS);
   worker.addHitbox(hitbox);
   
   const tribe = findTribe(tribeID, position);
   
   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];

   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, true, false);
   PhysicsComponentArray.addComponent(worker.id, physicsComponent);

   const healthComponent = new HealthComponent(tribeInfo.maxHealthWorker);
   HealthComponentArray.addComponent(worker.id, healthComponent);

   const statusEffectComponent = new StatusEffectComponent(0);
   StatusEffectComponentArray.addComponent(worker.id, statusEffectComponent);

   const tribeComponent = new TribeComponent(tribe);
   TribeComponentArray.addComponent(worker.id, tribeComponent);

   const tribeMemberComponent = new TribeMemberComponent(tribe.tribeType, EntityType.tribeWorker);
   TribeMemberComponentArray.addComponent(worker.id, tribeMemberComponent);

   const tribesmanAIComponent = new TribesmanAIComponent(hutID);
   TribesmanAIComponentArray.addComponent(worker.id, tribesmanAIComponent);

   const aiHelperComponent = new AIHelperComponent(TRIBE_WORKER_VISION_RANGE);
   AIHelperComponentArray.addComponent(worker.id, aiHelperComponent);

   const inventoryUseComponent = new InventoryUseComponent();
   InventoryUseComponentArray.addComponent(worker.id, inventoryUseComponent);

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(worker.id, inventoryComponent);

   const componentRecord: ComponentRecord = {
      [ServerComponentType.physics]: physicsComponent,
      [ServerComponentType.health]: healthComponent,
      [ServerComponentType.statusEffect]: statusEffectComponent,
      [ServerComponentType.tribe]: tribeComponent,
      [ServerComponentType.tribeMember]: tribeMemberComponent,
      [ServerComponentType.tribesmanAI]: tribesmanAIComponent,
      [ServerComponentType.aiHelper]: aiHelperComponent,
      [ServerComponentType.inventoryUse]: inventoryUseComponent,
      [ServerComponentType.inventory]: inventoryComponent
   };

   // @Hack @Copynpaste
   TribeMemberComponentArray.onInitialise!(worker, componentRecord);

   return {
      entity: worker,
      components: componentRecord
   };
}

export function tickTribeWorker(worker: EntityID): void {
   tickTribesman(worker);
}

// @Cleanup: copy and paste
export function onTribeWorkerDeath(worker: Entity): void {
   // 
   // Attempt to respawn the tribesman when it is killed
   // 
   
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(worker.id);

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