import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { ScarInfo } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { randInt, Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import Tribe from "../../Tribe";
import { HealthComponentArray, InventoryComponentArray, InventoryUseComponentArray, TribeComponentArray, TribeMemberComponentArray, TribeWarriorComponentArray, TribesmanComponentArray } from "../../components/ComponentArray";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { HealthComponent } from "../../components/HealthComponent";
import { InventoryComponent, addItemToInventory, createNewInventory, dropInventory } from "../../components/InventoryComponent";
import { InventoryUseComponent } from "../../components/InventoryUseComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeMemberComponent, awardTitle } from "../../components/TribeMemberComponent";
import { TribesmanComponent } from "../../components/TribesmanComponent";
import Board from "../../Board";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { tickTribesman } from "./tribesman-ai/tribesman-ai";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { TribeWarriorComponent } from "../../components/TribeWarriorComponent";

export const TRIBE_WARRIOR_RADIUS = 32;
const INVENTORY_SIZE = 5;
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

export function createTribeWarrior(position: Point, tribe: Tribe, hutID: number): Entity {
   const warrior = new Entity(position, EntityType.tribeWarrior, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(warrior.position.x, warrior.position.y, 1.5, 0, 0, HitboxCollisionType.soft, TRIBE_WARRIOR_RADIUS, warrior.getNextHitboxLocalID(), warrior.rotation);
   warrior.addHitbox(hitbox);
   
   const tribeInfo = TRIBE_INFO_RECORD[tribe.type];
   PhysicsComponentArray.addComponent(warrior.id, new PhysicsComponent(true, false));
   // @Temporary
   HealthComponentArray.addComponent(warrior.id, new HealthComponent(tribeInfo.maxHealthPlayer * 100));
   StatusEffectComponentArray.addComponent(warrior.id, new StatusEffectComponent(0));
   TribeComponentArray.addComponent(warrior.id, new TribeComponent(tribe));
   TribeMemberComponentArray.addComponent(warrior.id, new TribeMemberComponent(tribe.type, EntityType.tribeWarrior));
   TribesmanComponentArray.addComponent(warrior.id, new TribesmanComponent(hutID));
   AIHelperComponentArray.addComponent(warrior.id, new AIHelperComponent(TRIBE_WARRIOR_VISION_RANGE));
   TribeWarriorComponentArray.addComponent(warrior.id, new TribeWarriorComponent(generateScars()));

   const inventoryUseComponent = new InventoryUseComponent();
   InventoryUseComponentArray.addComponent(warrior.id, inventoryUseComponent);

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(warrior.id, inventoryComponent);

   const hotbarInventory = createNewInventory(inventoryComponent, InventoryName.hotbar, INVENTORY_SIZE, 1, true);
   inventoryUseComponent.addInventoryUseInfo(hotbarInventory);
   const offhandInventory = createNewInventory(inventoryComponent, InventoryName.offhand, 1, 1, false);
   inventoryUseComponent.addInventoryUseInfo(offhandInventory);
   createNewInventory(inventoryComponent, InventoryName.armourSlot, 1, 1, false);
   createNewInventory(inventoryComponent, InventoryName.backpackSlot, 1, 1, false);
   createNewInventory(inventoryComponent, InventoryName.gloveSlot, 1, 1, false);
   createNewInventory(inventoryComponent, InventoryName.backpack, 0, 0, false);

   // @Temporary
   addItemToInventory(inventoryComponent, InventoryName.hotbar, ItemType.deepfrost_sword, 1);
   addItemToInventory(inventoryComponent, InventoryName.offhand, ItemType.deepfrost_sword, 1);
   addItemToInventory(inventoryComponent, InventoryName.armourSlot, ItemType.frost_armour, 1);
   
   // @Temporary
   setTimeout(() => {
      awardTitle(warrior, TribesmanTitle.bloodaxe);
      awardTitle(warrior, TribesmanTitle.deathbringer);
      awardTitle(warrior, TribesmanTitle.sprinter);
   }, 100);
   
   return warrior;
}

export function tickTribeWarrior(warrior: Entity): void {
   tickTribesman(warrior);
}

export function onTribeWarriorJoin(warrior: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(warrior.id);
   tribeComponent.tribe.registerNewTribeMember(warrior);
}

export function onTribeWarriorDeath(warrior: Entity): void {
   // Attempt to respawn the tribesman when it is killed
   // Only respawn the tribesman if their hut is alive
   const tribesmanComponent = TribesmanComponentArray.getComponent(warrior.id);

   const hut = Board.entityRecord[tribesmanComponent.hutID];
   if (typeof hut === "undefined") {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(warrior.id);
   tribeComponent.tribe.respawnTribesman(hut);
   
   const inventoryComponent = InventoryComponentArray.getComponent(warrior.id);
   dropInventory(warrior, inventoryComponent, InventoryName.hotbar, 38);
   dropInventory(warrior, inventoryComponent, InventoryName.armourSlot, 38);
   dropInventory(warrior, inventoryComponent, InventoryName.backpackSlot, 38);
   dropInventory(warrior, inventoryComponent, InventoryName.offhand, 38);
}

export function onTribeWarriorRemove(warrior: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(warrior.id);
   tribeComponent.tribe.registerTribeMemberDeath(warrior);
}