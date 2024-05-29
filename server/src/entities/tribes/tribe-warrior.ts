import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { ScarInfo } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { randInt, Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import Tribe from "../../Tribe";
import CircularHitbox from "../../hitboxes/CircularHitbox";
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
import { TribeWarriorComponent, TribeWarriorComponentArray } from "../../components/TribeWarriorComponent";

export const TRIBE_WARRIOR_RADIUS = 32;
export const TRIBE_WARRIOR_VISION_RANGE = 560;

const generateScars = (): ReadonlyArray<ScarInfo> => {
   let numScars = 1;
   while (Math.random() < 0.65 / numScars) {
      numScars++;
   }

   const scars = new Array<ScarInfo>();
   for (let i = 0; i < numScars; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetMagnitude = 20 * Math.random();
      scars.push({
         offsetX: offsetMagnitude * Math.sin(offsetDirection),
         offsetY: offsetMagnitude * Math.cos(offsetDirection),
         rotation: Math.PI / 2 * randInt(0, 3),
         type: randInt(0, 1)
      });
   }
   return scars;
}

export function createTribeWarrior(position: Point, rotation: number, tribe: Tribe, hutID: number): Entity {
   const warrior = new Entity(position, rotation, EntityType.tribeWarrior, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(position, 1.5, 0, 0, HitboxCollisionType.soft, TRIBE_WARRIOR_RADIUS, warrior.getNextHitboxLocalID(), warrior.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   warrior.addHitbox(hitbox);
   
   const tribeInfo = TRIBE_INFO_RECORD[tribe.type];
   PhysicsComponentArray.addComponent(warrior.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(warrior.id, new HealthComponent(tribeInfo.maxHealthPlayer));
   StatusEffectComponentArray.addComponent(warrior.id, new StatusEffectComponent(0));
   TribeComponentArray.addComponent(warrior.id, new TribeComponent(tribe));
   TribeMemberComponentArray.addComponent(warrior.id, new TribeMemberComponent(tribe.type, EntityType.tribeWarrior));
   TribesmanAIComponentArray.addComponent(warrior.id, new TribesmanAIComponent(hutID));
   AIHelperComponentArray.addComponent(warrior.id, new AIHelperComponent(TRIBE_WARRIOR_VISION_RANGE));
   TribeWarriorComponentArray.addComponent(warrior.id, new TribeWarriorComponent(generateScars()));

   const inventoryUseComponent = new InventoryUseComponent();
   InventoryUseComponentArray.addComponent(warrior.id, inventoryUseComponent);

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(warrior.id, inventoryComponent);

   return warrior;
}

export function tickTribeWarrior(warrior: Entity): void {
   tickTribesman(warrior);
}

export function onTribeWarriorDeath(warrior: Entity): void {
   // Attempt to respawn the tribesman when it is killed
   // Only respawn the tribesman if their hut is alive
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(warrior.id);

   const hut = Board.entityRecord[tribesmanComponent.hutID];
   if (typeof hut === "undefined") {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(warrior.id);
   tribeComponent.tribe.respawnTribesman(hut);
}