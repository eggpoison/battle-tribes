import { HitboxCollisionType, AttackPacket } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { PlanterBoxPlant, BuildingMaterial, MATERIAL_TO_ITEM_MAP } from "webgl-test-shared/dist/components";
import { CRAFTING_RECIPES, ItemRequirements } from "webgl-test-shared/dist/crafting-recipes";
import { EntityType, EntityTypeString, LimbAction } from "webgl-test-shared/dist/entities";
import { ItemType, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, ConsumableItemInfo, ConsumableItemCategory, BowItemInfo } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { TechInfo, TechID, getTechByID } from "webgl-test-shared/dist/techs";
import { TRIBE_INFO_RECORD, TribeType } from "webgl-test-shared/dist/tribes";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { attemptAttack, calculateAttackTarget, calculateBlueprintWorkTarget, calculateRadialAttackTargets, calculateRepairTarget, getAvailableCraftingStations, onTribeMemberHurt, repairBuilding, tickTribeMember, tribeMemberCanPickUpItem, useItem } from "./tribe-member";
import Tribe from "../../Tribe";
import { BuildingMaterialComponentArray, HealthComponentArray, HutComponentArray, InventoryComponentArray, InventoryUseComponentArray, ItemComponentArray, PlayerComponentArray, SpikesComponentArray, TribeComponentArray, TribeMemberComponentArray, TunnelComponentArray } from "../../components/ComponentArray";
import { InventoryComponent, addItemToSlot, recipeCraftingStationIsAvailable, consumeItemFromSlot, consumeItemType, consumeItemTypeFromInventory, countItemType, craftRecipe, createNewInventory, dropInventory, getInventory, getItem, inventoryComponentCanAffordRecipe, pickupItemEntity, addItem } from "../../components/InventoryComponent";
import Board from "../../Board";
import { itemEntityCanBePickedUp } from "../item-entity";
import { HealthComponent } from "../../components/HealthComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { InventoryUseComponent, getInventoryUseInfo, setLimbActions } from "../../components/InventoryUseComponent";
import { SERVER } from "../../server";
import { TribeMemberComponent, awardTitle } from "../../components/TribeMemberComponent";
import { PlayerComponent } from "../../components/PlayerComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { toggleDoor } from "../../components/DoorComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponent } from "../../components/TribeComponent";
import { deoccupyResearchBench, attemptToOccupyResearchBench } from "../../components/ResearchBenchComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { toggleTunnelDoor, updateTunnelDoorBitset } from "../../components/TunnelComponent";
import { placePlantInPlanterBox } from "../../components/PlanterBoxComponent";
import { createItem } from "../../items";
import { toggleFenceGateDoor } from "../../components/FenceGateComponent";

/** How far away from the entity the attack is done */
const ATTACK_OFFSET = 50;
/** Max distance from the attack position that the attack will be registered from */
const ATTACK_RADIUS = 50;

const VACUUM_RANGE = 85;
const VACUUM_STRENGTH = 25;

export function createPlayer(position: Point, tribe: Tribe): Entity {
   const player = new Entity(position, EntityType.player, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(player.position.x, player.position.y, 1.25, 0, 0, HitboxCollisionType.soft, 32, player.getNextHitboxLocalID(), player.rotation);
   player.addHitbox(hitbox);

   const tribeInfo = TRIBE_INFO_RECORD[tribe.type];
   PhysicsComponentArray.addComponent(player.id, new PhysicsComponent(true, false));
   HealthComponentArray.addComponent(player.id, new HealthComponent(tribeInfo.maxHealthPlayer));
   StatusEffectComponentArray.addComponent(player.id, new StatusEffectComponent(0));
   TribeComponentArray.addComponent(player.id, new TribeComponent(tribe));
   TribeMemberComponentArray.addComponent(player.id, new TribeMemberComponent(tribe.type, EntityType.player));
   PlayerComponentArray.addComponent(player.id, new PlayerComponent());

   const inventoryUseComponent = new InventoryUseComponent();
   InventoryUseComponentArray.addComponent(player.id, inventoryUseComponent);

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(player.id, inventoryComponent);

   const hotbarInventory = createNewInventory(inventoryComponent, "hotbar", Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, true);
   inventoryUseComponent.addInventoryUseInfo(hotbarInventory);
   const offhandInventory = createNewInventory(inventoryComponent, "offhand", 1, 1, false);
   inventoryUseComponent.addInventoryUseInfo(offhandInventory);
   createNewInventory(inventoryComponent, "craftingOutputSlot", 1, 1, false);
   createNewInventory(inventoryComponent, "heldItemSlot", 1, 1, false);
   createNewInventory(inventoryComponent, "armourSlot", 1, 1, false);
   createNewInventory(inventoryComponent, "backpackSlot", 1, 1, false);
   createNewInventory(inventoryComponent, "gloveSlot", 1, 1, false);
   createNewInventory(inventoryComponent, "backpack", 0, 0, false);

   // @Temporary
   // addItem(inventoryComponent, createItem(ItemType.gardening_gloves, 1));
   // addItem(inventoryComponent, createItem(ItemType.gathering_gloves, 1));
   // addItem(inventoryComponent, createItem(ItemType.wooden_spikes, 5));
   // addItem(inventoryComponent, createItem(ItemType.leaf, 10));

   // addItem(inventoryComponent, createItem(ItemType.planter_box, 5));
   // addItem(inventoryComponent, createItem(ItemType.seed, 10));
   // addItem(inventoryComponent, createItem(ItemType.berry, 10));
   // addItem(inventoryComponent, createItem(ItemType.frostcicle, 10));

   addItem(inventoryComponent, createItem(ItemType.wooden_fence, 99));
   addItem(inventoryComponent, createItem(ItemType.wooden_hammer, 1));
   addItem(inventoryComponent, createItem(ItemType.wood, 10));
   
   // setTimeout(() => {
   //    awardTitle(player, TribesmanTitle.yetisbane);
   // }, 200);
   // setTimeout(() => {
   //    awardTitle(player, TribesmanTitle.berrymuncher);
   // }, 4000);

   return player;
}

export function tickPlayer(player: Entity): void {
   tickTribeMember(player);
   
   // Vacuum nearby items to the player
   // @Incomplete: Don't vacuum items which the player doesn't have the inventory space for
   const minChunkX = Math.max(Math.floor((player.position.x - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((player.position.x + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((player.position.y - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((player.position.y + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const itemEntity of chunk.entities) {
            if (itemEntity.type !== EntityType.itemEntity || !itemEntityCanBePickedUp(itemEntity, player.id)) {
               continue;
            }

            const itemComponent = ItemComponentArray.getComponent(itemEntity.id);
            if (!tribeMemberCanPickUpItem(player, itemComponent.itemType)) {
               continue;
            }
            
            const distance = player.position.calculateDistanceBetween(itemEntity.position);
            if (distance <= VACUUM_RANGE) {
               const vacuumDirection = itemEntity.position.calculateAngleBetween(player.position);
               itemEntity.velocity.x += VACUUM_STRENGTH * Math.sin(vacuumDirection);
               itemEntity.velocity.y += VACUUM_STRENGTH * Math.cos(vacuumDirection);
            }
         }
      }
   }
}

export function onPlayerCollision(player: Entity, collidingEntity: Entity): void {
   if (collidingEntity.type === EntityType.itemEntity) {
      const wasPickedUp = pickupItemEntity(player, collidingEntity);
      if (wasPickedUp) {
         SERVER.registerPlayerDroppedItemPickup(player);
      }
   }
}

export function onPlayerHurt(player: Entity, collidingEntity: Entity): void {
   onTribeMemberHurt(player, collidingEntity);
}

export function onPlayerDeath(player: Entity): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   
   dropInventory(player, inventoryComponent, "hotbar", 38);
   dropInventory(player, inventoryComponent, "armourSlot", 38);
   dropInventory(player, inventoryComponent, "backpackSlot", 38);
   dropInventory(player, inventoryComponent, "offhand", 38);
}

export function onPlayerJoin(player: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(player.id);
   tribeComponent.tribe.registerNewTribeMember(player);
}

export function onPlayerRemove(player: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(player.id);
   tribeComponent.tribe.registerTribeMemberDeath(player);
}

export function processPlayerCraftingPacket(player: Entity, recipeIndex: number): void {
   if (recipeIndex < 0 || recipeIndex >= CRAFTING_RECIPES.length) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const craftingRecipe = CRAFTING_RECIPES[recipeIndex];

   const availableCraftingStations = getAvailableCraftingStations(player);
   if (!recipeCraftingStationIsAvailable(availableCraftingStations, craftingRecipe)) {
      return;
   }

   if (inventoryComponentCanAffordRecipe(inventoryComponent, craftingRecipe, "craftingOutputSlot")) {
      craftRecipe(inventoryComponent, craftingRecipe, "craftingOutputSlot");
   }
}

export function processItemPickupPacket(player: Entity, entityID: number, inventoryName: string, itemSlot: number, amount: number): void {
   if (!Board.entityRecord.hasOwnProperty(entityID)) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   
   // Don't pick up the item if there is already a held item
   if (getInventory(inventoryComponent, "heldItemSlot").itemSlots.hasOwnProperty(1)) {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entityID);

   const pickedUpItem = getItem(targetInventoryComponent, inventoryName, itemSlot);
   if (pickedUpItem === null) return;

   // Hold the item
   addItemToSlot(inventoryComponent, "heldItemSlot", 1, pickedUpItem.type, amount);

   // Remove the item from its previous inventory
   consumeItemFromSlot(targetInventoryComponent, inventoryName, itemSlot, amount);
}

export function processItemReleasePacket(player: Entity, entityID: number, inventoryName: string, itemSlot: number, amount: number): void {
   if (!Board.entityRecord.hasOwnProperty(entityID)) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(player.id);

   // Don't release an item if there is no held item
   const heldItemInventory = getInventory(inventoryComponent, "heldItemSlot");
   if (!heldItemInventory.itemSlots.hasOwnProperty(1)) return;

   const targetInventoryComponent = InventoryComponentArray.getComponent(entityID);

   const heldItem = heldItemInventory.itemSlots[1];
   
   // Add the item to the inventory
   const amountAdded = addItemToSlot(targetInventoryComponent, inventoryName, itemSlot, heldItem.type, amount);

   // If all of the item was added, clear the held item
   consumeItemTypeFromInventory(inventoryComponent, "heldItemSlot", heldItem.type, amountAdded);
}

export function processItemUsePacket(player: Entity, itemSlot: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);

   const item = getItem(inventoryComponent, "hotbar", itemSlot);
   if (item !== null)  {
      useItem(player, item, "hotbar", itemSlot);
   }
}

/** Returns whether the swing was successfully swang or not */
const attemptSwing = (player: Entity, attackTargets: ReadonlyArray<Entity>, itemSlot: number, inventoryName: string): boolean => {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const item = getItem(inventoryComponent, inventoryName, itemSlot);
   if (item !== null && ITEM_TYPE_RECORD[item.type] === "hammer") {
      // First look for friendly buildings to repair
      const repairTarget = calculateRepairTarget(player, attackTargets);
      if (repairTarget !== null) {
         return repairBuilding(player, repairTarget, itemSlot, inventoryName);
      }

      // Then look for attack targets
      const attackTarget = calculateAttackTarget(player, attackTargets, ~(EntityRelationship.friendly | EntityRelationship.friendlyBuilding));
      if (attackTarget !== null) {
         return attemptAttack(player, attackTarget, itemSlot, inventoryName);
      }

      // Then look for blueprints to work on
      const workTarget = calculateBlueprintWorkTarget(player, attackTargets);
      if (workTarget !== null) {
         return repairBuilding(player, workTarget, itemSlot, inventoryName);
      }

      return false;
   }
   
   // For non-hammer items, just look for attack targets
   const attackTarget = calculateAttackTarget(player, attackTargets, ~EntityRelationship.friendly);
   if (attackTarget !== null) {
      return attemptAttack(player, attackTarget, itemSlot, inventoryName);
   }

   return false;
}

export function processPlayerAttackPacket(player: Entity, attackPacket: AttackPacket): void {
   const targets = calculateRadialAttackTargets(player, ATTACK_OFFSET, ATTACK_RADIUS);

   const didSwingWithRightHand = attemptSwing(player, targets, attackPacket.itemSlot, "hotbar");
   if (didSwingWithRightHand) {
      return;
   }

   // If a barbarian, attack with offhand
   const tribeComponent = TribeComponentArray.getComponent(player.id);
   if (tribeComponent.tribe.type === TribeType.barbarians) {
      attemptSwing(player, targets, 1, "offhand");
   }
}

export function startEating(player: Entity, inventoryName: string): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);
   
   // Reset the food timer so that the food isn't immediately eaten
   const foodItem = getItem(inventoryComponent, inventoryName, useInfo.selectedItemSlot);
   if (foodItem !== null) {
      const itemInfo = ITEM_INFO_RECORD[foodItem.type] as ConsumableItemInfo;
      useInfo.foodEatingTimer = itemInfo.consumeTime;

      if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
         setLimbActions(inventoryUseComponent, LimbAction.useMedicine);
         return true;
      }
   }
   
   useInfo.action = LimbAction.eat;
   return false;
}

export function startChargingBow(player: Entity, inventoryName: string): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   // Reset the cooldown so the bow doesn't fire immediately
   const bow = getItem(inventoryComponent, inventoryName, useInfo.selectedItemSlot);
   if (bow !== null) {
      const itemInfo = ITEM_INFO_RECORD[bow.type] as BowItemInfo;
      useInfo.bowCooldownTicks = itemInfo.shotCooldownTicks;
      useInfo.lastBowChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeBow;
}

export function startChargingSpear(player: Entity, inventoryName: string): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   // Reset the cooldown so the battleaxe doesn't fire immediately
   const spear = getItem(inventoryComponent, inventoryName, useInfo.selectedItemSlot);
   if (spear !== null) {
      useInfo.lastSpearChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeSpear;
}

export function startChargingBattleaxe(player: Entity, inventoryName: string): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   // Reset the cooldown so the battleaxe doesn't fire immediately
   const battleaxe = getItem(inventoryComponent, inventoryName, useInfo.selectedItemSlot);
   if (battleaxe !== null) {
      useInfo.lastBattleaxeChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeBattleaxe;
}

const itemIsNeededInTech = (tech: TechInfo, itemProgress: ItemRequirements, itemType: ItemType): boolean => {
   // If the item isn't present in the item requirements then it isn't needed
   if (!tech.researchItemRequirements.hasOwnProperty(itemType)) {
      return false;
   }
   
   const amountNeeded = tech.researchItemRequirements[itemType]!;
   const amountCommitted = itemProgress.hasOwnProperty(itemType) ? itemProgress[itemType]! : 0;

   return amountCommitted < amountNeeded;
}

const hasMetTechItemRequirements = (tech: TechInfo, itemProgress: ItemRequirements): boolean => {
   for (const [itemType, itemAmount] of Object.entries(tech.researchItemRequirements)) {
      if (!itemProgress.hasOwnProperty(itemType)) {
         return false;
      }

      if (itemAmount !== itemProgress[itemType as unknown as ItemType]) {
         return false;
      }
   }

   return true;
}

const hasMetTechStudyRequirements = (tech: TechInfo, tribe: Tribe): boolean => {
   if (!tribe.techTreeUnlockProgress.hasOwnProperty(tech.id)) {
      return false;
   }

   if (tech.researchStudyRequirements === 0) {
      return true;
   }

   return tribe.techTreeUnlockProgress[tech.id]!.studyProgress >= tech.researchStudyRequirements;
}

export function processTechUnlock(player: Entity, techID: TechID): void {
   const tech = getTechByID(techID);
   
   const tribeComponent = TribeComponentArray.getComponent(player.id);
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);

   const hotbarInventory = getInventory(inventoryComponent, "hotbar");
   
   // Consume any available items
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      if (!hotbarInventory.itemSlots.hasOwnProperty(itemSlot)) {
         continue;
      }

      const item = hotbarInventory.itemSlots[itemSlot];
      const itemProgress = tribeComponent.tribe.techTreeUnlockProgress[techID]?.itemProgress || {};
      if (itemIsNeededInTech(tech, itemProgress, item.type)) {
         const amountNeeded = tech.researchItemRequirements[item.type]!;
         const amountCommitted = itemProgress.hasOwnProperty(item.type) ? itemProgress[item.type]! : 0;

         const amountToAdd = Math.min(item.count, amountNeeded - amountCommitted);

         item.count -= amountToAdd;
         if (item.count === 0) {
            delete hotbarInventory.itemSlots[itemSlot];
         }

         if (tribeComponent.tribe.techTreeUnlockProgress.hasOwnProperty(techID)) {
            tribeComponent.tribe.techTreeUnlockProgress[techID]!.itemProgress[item.type] = amountCommitted + amountToAdd;
         } else {
            tribeComponent.tribe.techTreeUnlockProgress[techID] = {
               itemProgress: {
                  [item.type]: amountCommitted + amountToAdd
               },
               studyProgress: 0
            };
         }
      }
   }

   if (hasMetTechItemRequirements(tech, tribeComponent.tribe.techTreeUnlockProgress[techID]?.itemProgress || {}) && hasMetTechStudyRequirements(tech, tribeComponent.tribe)) {
      tribeComponent.tribe.unlockTech(techID);
   }
}

const modifyTunnel = (player: Entity, tunnel: Entity): void => {
   const tunnelComponent = TunnelComponentArray.getComponent(tunnel.id);
   if (tunnelComponent.doorBitset !== 0b00 && tunnelComponent.doorBitset !== 0b01 && tunnelComponent.doorBitset !== 0b10) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   if (countItemType(inventoryComponent, ItemType.wood) < 2) {
      return;
   }

   consumeItemType(inventoryComponent, ItemType.wood, 2);
   
   switch (tunnelComponent.doorBitset) {
      case 0b00: {
         // Place the door blueprint on whichever side is closest to the player
         const dirToPlayer = tunnel.position.calculateAngleBetween(player.position);
         const dot = Math.sin(tunnel.rotation) * Math.sin(dirToPlayer) + Math.cos(tunnel.rotation) * Math.cos(dirToPlayer);

         if (dot > 0) {
            // Top door
            updateTunnelDoorBitset(tunnel, 0b01);
         } else {
            // Bottom door
            updateTunnelDoorBitset(tunnel, 0b10);
         }
         break;
      }
      case 0b10:
      case 0b01: {
         // One door is already placed, so place the other one
         updateTunnelDoorBitset(tunnel, 0b11);
         break;
      }
   }
}

const modifyHut = (hut: Entity): void => {
   const hutComponent = HutComponentArray.getComponent(hut.id);

   if (!hutComponent.isRecalling) {
      // Start recall
      hutComponent.isRecalling = true;
   } else {
      // Stop recall

      // If the tribesman is already recalled into the hut, spawn a new one
      if (!hutComponent.hasSpawnedTribesman && hutComponent.hasTribesman) {
         const tribeComponent = TribeComponentArray.getComponent(hut.id);
         tribeComponent.tribe.createNewTribesman(hut);
      }
         
      hutComponent.isRecalling = false;
   }
}

const modifySpikes = (player: Entity, spikes: Entity): void => {
   const spikesComponent = SpikesComponentArray.getComponent(spikes.id);
   // Can only cover non-covered floor spikes
   if (spikesComponent.isCovered || spikesComponent.attachedWallID !== 0) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   if (countItemType(inventoryComponent, ItemType.leaf) < 5) {
      return;
   }

   consumeItemType(inventoryComponent, ItemType.leaf, 5);

   spikesComponent.isCovered = true;
}

const modifyPlanterBox = (planterBox: Entity, plant: PlanterBoxPlant): void => {
   placePlantInPlanterBox(planterBox, plant);
}

export function modifyBuilding(player: Entity, buildingID: number, data: number): void {
   const building = Board.entityRecord[buildingID];
   if (typeof building === "undefined") {
      return;
   }

   switch (building.type) {
      case EntityType.tunnel: {
         modifyTunnel(player, building);
         break;
      }
      case EntityType.workerHut:
      case EntityType.warriorHut: {
         modifyHut(building);
         break;
      }
      case EntityType.floorSpikes:
      case EntityType.wallSpikes:
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks: {
         modifySpikes(player, building);
         break;
      }
      case EntityType.planterBox: {
         modifyPlanterBox(building, data);
         break;
      }
      default: {
         console.warn("Don't know how to modify building of type " + EntityTypeString[building.type]);
         break;
      }
   }
}

export function deconstructBuilding(buildingID: number): void {
   const building = Board.entityRecord[buildingID];
   if (typeof building === "undefined") {
      return;
   }

   if (!BuildingMaterialComponentArray.hasComponent(building.id)) {
      return;
   }

   // Deconstruct
   building.remove();

   const materialComponent = BuildingMaterialComponentArray.getComponent(building.id);
   
   if (building.type === EntityType.wall && materialComponent.material === BuildingMaterial.wood) {
      createItemsOverEntity(building, ItemType.wooden_wall, 1, 40);
      return;
   }
   
   const materialItemType = MATERIAL_TO_ITEM_MAP[materialComponent.material];
   createItemsOverEntity(building, materialItemType, 5, 40);
   return;
}

export function interactWithStructure(player: Entity, structureID: number, interactData: number): void {
   const structure = Board.entityRecord[structureID];
   if (typeof structure === "undefined") {
      return;
   }

   switch (structure.type) {
      case EntityType.door: {
         toggleDoor(structure);
         break;
      }
      case EntityType.researchBench: {
         attemptToOccupyResearchBench(structure, player);
         break;
      }
      case EntityType.tunnel: {
         const doorBit = interactData;
         toggleTunnelDoor(structure, doorBit);
         break;
      }
      case EntityType.fenceGate: {
         toggleFenceGateDoor(structure);
         break;
      }
   }
}

export function uninteractWithStructure(player: Entity, structureID: number): void {
   const structure = Board.entityRecord[structureID];
   if (typeof structure === "undefined") {
      return;
   }

   switch (structure.type) {
      case EntityType.researchBench: {
         deoccupyResearchBench(structure, player);
         break;
      }
   }
}