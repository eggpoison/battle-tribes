import { HitboxCollisionType, AttackPacket } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { PlanterBoxPlant, BuildingMaterial, MATERIAL_TO_ITEM_MAP } from "webgl-test-shared/dist/components";
import { CRAFTING_RECIPES, ItemRequirements } from "webgl-test-shared/dist/crafting-recipes";
import { EntityType, EntityTypeString, LimbAction } from "webgl-test-shared/dist/entities";
import { ItemType, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, ConsumableItemInfo, ConsumableItemCategory, BowItemInfo, InventoryName } from "webgl-test-shared/dist/items";
import { TechInfo, TechID, getTechByID } from "webgl-test-shared/dist/techs";
import { TRIBE_INFO_RECORD, TribeType } from "webgl-test-shared/dist/tribes";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { attemptAttack, calculateAttackTarget, calculateBlueprintWorkTarget, calculateRadialAttackTargets, calculateRepairTarget, getAvailableCraftingStations, onTribeMemberHurt, repairBuilding, tickTribeMember, useItem } from "./tribe-member";
import Tribe from "../../Tribe";
import { BuildingMaterialComponentArray, HealthComponentArray, HutComponentArray, InventoryUseComponentArray, PlayerComponentArray, SpikesComponentArray, TribeComponentArray, TunnelComponentArray } from "../../components/ComponentArray";
import { InventoryComponent, addItemToSlot, recipeCraftingStationIsAvailable, consumeItemFromSlot, consumeItemType, consumeItemTypeFromInventory, countItemType, craftRecipe, getInventory, inventoryComponentCanAffordRecipe, pickupItemEntity, addItem, InventoryComponentArray } from "../../components/InventoryComponent";
import Board from "../../Board";
import { HealthComponent } from "../../components/HealthComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { InventoryUseComponent, getInventoryUseInfo, setLimbActions } from "../../components/InventoryUseComponent";
import { SERVER } from "../../server";
import { TribeMemberComponent, TribeMemberComponentArray, awardTitle } from "../../components/TribeMemberComponent";
import { PlayerComponent } from "../../components/PlayerComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { toggleDoor } from "../../components/DoorComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponent } from "../../components/TribeComponent";
import { deoccupyResearchBench, attemptToOccupyResearchBench } from "../../components/ResearchBenchComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { toggleTunnelDoor, updateTunnelDoorBitset } from "../../components/TunnelComponent";
import { PlanterBoxComponentArray, fertilisePlanterBox, placePlantInPlanterBox } from "../../components/PlanterBoxComponent";
import { createItem } from "../../items";
import { toggleFenceGateDoor } from "../../components/FenceGateComponent";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { StructureComponentArray, isAttachedToWall } from "../../components/StructureComponent";

/** How far away from the entity the attack is done */
const ATTACK_OFFSET = 50;
/** Max distance from the attack position that the attack will be registered from */
const ATTACK_RADIUS = 50;

export function createPlayer(position: Point, tribe: Tribe): Entity {
   const player = new Entity(position, 0, EntityType.player, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(position, 1.25, 0, 0, HitboxCollisionType.soft, 32, player.getNextHitboxLocalID(), player.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   player.addHitbox(hitbox);

   const tribeInfo = TRIBE_INFO_RECORD[tribe.type];
   PhysicsComponentArray.addComponent(player.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(player.id, new HealthComponent(tribeInfo.maxHealthPlayer));
   StatusEffectComponentArray.addComponent(player.id, new StatusEffectComponent(0));
   TribeComponentArray.addComponent(player.id, new TribeComponent(tribe));
   TribeMemberComponentArray.addComponent(player.id, new TribeMemberComponent(tribe.type, EntityType.player));
   PlayerComponentArray.addComponent(player.id, new PlayerComponent());

   const inventoryUseComponent = new InventoryUseComponent();
   InventoryUseComponentArray.addComponent(player.id, inventoryUseComponent);

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(player.id, inventoryComponent);

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
   addItem(inventoryComponent, createItem(ItemType.wooden_wall, 50));
   
   setTimeout(() => {
      awardTitle(player, TribesmanTitle.gardener);
   }, 300);

   return player;
}

export function tickPlayer(player: Entity): void {
   tickTribeMember(player);
}

export function onPlayerCollision(player: Entity, collidingEntity: Entity): void {
   if (collidingEntity.type === EntityType.itemEntity) {
      const wasPickedUp = pickupItemEntity(player.id, collidingEntity);
      if (wasPickedUp) {
         SERVER.registerPlayerDroppedItemPickup(player);
      }
   }
}

export function onPlayerHurt(player: Entity, attackingEntityID: number): void {
   onTribeMemberHurt(player, attackingEntityID);
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

   if (inventoryComponentCanAffordRecipe(inventoryComponent, craftingRecipe, InventoryName.craftingOutputSlot)) {
      craftRecipe(inventoryComponent, craftingRecipe, InventoryName.craftingOutputSlot);
   }
}

export function processItemPickupPacket(player: Entity, entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   if (typeof Board.entityRecord[entityID] === "undefined") {
      return;
   }

   const playerInventoryComponent = InventoryComponentArray.getComponent(player.id);
   const heldItemInventory = getInventory(playerInventoryComponent, InventoryName.heldItemSlot);
   
   // Don't pick up the item if there is already a held item
   if (typeof heldItemInventory.itemSlots[1] !== "undefined") {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entityID);
   const targetInventory = getInventory(targetInventoryComponent, inventoryName);

   const pickedUpItem = targetInventory.itemSlots[itemSlot];
   if (typeof pickedUpItem === "undefined") {
      return;
   }

   // Hold the item
   // Copy it as the consumeItemFromSlot function modifies the original item's count
   const heldItem = createItem(pickedUpItem.type, pickedUpItem.count);
   heldItemInventory.addItem(heldItem, 1);

   // Remove the item from its previous inventory
   consumeItemFromSlot(targetInventory, itemSlot, amount);
}

export function processItemReleasePacket(player: Entity, entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   if (typeof Board.entityRecord[entityID] === "undefined") {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   
   // Don't release an item if there is no held item
   const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const heldItem = heldItemInventory.itemSlots[1];
   if (typeof heldItem === "undefined") {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entityID);

   // Add the item to the inventory
   const amountAdded = addItemToSlot(targetInventoryComponent, inventoryName, itemSlot, heldItem.type, amount);

   // If all of the item was added, clear the held item
   consumeItemTypeFromInventory(inventoryComponent, InventoryName.heldItemSlot, heldItem.type, amountAdded);
}

export function processItemUsePacket(player: Entity, itemSlot: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.itemSlots[itemSlot];
   if (typeof item !== "undefined")  {
      useItem(player, item, InventoryName.hotbar, itemSlot);
   }
}

/** Returns whether the swing was successfully swang or not */
const attemptSwing = (player: Entity, attackTargets: ReadonlyArray<Entity>, itemSlot: number, inventoryName: InventoryName): boolean => {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventory = getInventory(inventoryComponent, inventoryName);

   const item = inventory.itemSlots[itemSlot];
   if (typeof item !== "undefined" && ITEM_TYPE_RECORD[item.type] === "hammer") {
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

   const didSwingWithRightHand = attemptSwing(player, targets, attackPacket.itemSlot, InventoryName.hotbar);
   if (didSwingWithRightHand) {
      return;
   }

   // If a barbarian, attack with offhand
   const tribeComponent = TribeComponentArray.getComponent(player.id);
   if (tribeComponent.tribe.type === TribeType.barbarians) {
      attemptSwing(player, targets, 1, InventoryName.offhand);
   }
}

// @Cleanup: ton of copy and paste between these functions

export function startEating(player: Entity, inventoryName: InventoryName): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);
   
   const inventory = getInventory(inventoryComponent, inventoryName);
   const foodItem = inventory.itemSlots[useInfo.selectedItemSlot];
   
   // Reset the food timer so that the food isn't immediately eaten
   if (typeof foodItem !== "undefined") {
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

export function startChargingBow(player: Entity, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const bow = inventory.itemSlots[useInfo.selectedItemSlot];

   // Reset the cooldown so the bow doesn't fire immediately
   if (typeof bow !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[bow.type] as BowItemInfo;
      useInfo.bowCooldownTicks = itemInfo.shotCooldownTicks;
      useInfo.lastBowChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeBow;
}

export function startChargingSpear(player: Entity, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const spear = inventory.itemSlots[useInfo.selectedItemSlot];

   // Reset the cooldown so the battleaxe doesn't fire immediately
   if (typeof spear !== "undefined") {
      useInfo.lastSpearChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeSpear;
}

export function startChargingBattleaxe(player: Entity, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const battleaxe = inventory.itemSlots[useInfo.selectedItemSlot];

   // Reset the cooldown so the battleaxe doesn't fire immediately
   if (typeof battleaxe !== "undefined") {
      useInfo.lastBattleaxeChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeBattleaxe;
}

const itemIsNeededInTech = (tech: TechInfo, itemRequirements: ItemRequirements, itemType: ItemType): boolean => {
   // If the item isn't present in the item requirements then it isn't needed
   const amountNeeded = tech.researchItemRequirements[itemType];
   if (typeof amountNeeded === "undefined") {
      return false;
   }
   
   const amountCommitted = itemRequirements[itemType] || 0;
   return amountCommitted < amountNeeded;
}

const hasMetTechItemRequirements = (tech: TechInfo, itemRequirements: ItemRequirements): boolean => {
   for (const [itemType, itemAmount] of Object.entries(tech.researchItemRequirements)) {
      const itemProgress = itemRequirements[itemType as unknown as ItemType];
      if (typeof itemProgress === "undefined") {
         return false;
      }

      if (itemAmount < itemProgress) {
         return false;
      }
   }

   return true;
}

const hasMetTechStudyRequirements = (tech: TechInfo, tribe: Tribe): boolean => {
   const techUnlockProgress = tribe.techTreeUnlockProgress[tech.id];
   if (typeof techUnlockProgress === "undefined") {
      return false;
   }

   if (tech.researchStudyRequirements === 0) {
      return true;
   }

   return techUnlockProgress.studyProgress >= tech.researchStudyRequirements;
}

export function processTechUnlock(player: Entity, techID: TechID): void {
   const tech = getTechByID(techID);
   
   const tribeComponent = TribeComponentArray.getComponent(player.id);
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);

   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   
   // Consume any available items
   for (let i = 0; i < hotbarInventory.items.length; i++) {
      const item = hotbarInventory.items[i];

      const itemProgress = tribeComponent.tribe.techTreeUnlockProgress[techID]?.itemProgress || {};
      if (itemIsNeededInTech(tech, itemProgress, item.type)) {
         const amountNeeded = tech.researchItemRequirements[item.type]!;
         const amountCommitted = itemProgress[item.type] || 0;

         const amountToAdd = Math.min(item.count, amountNeeded - amountCommitted);

         item.count -= amountToAdd;
         if (item.count === 0) {
            const itemSlot = hotbarInventory.getItemSlot(item);
            hotbarInventory.removeItem(itemSlot);
         }

         const unlockProgress = tribeComponent.tribe.techTreeUnlockProgress[techID];
         if (typeof unlockProgress !== "undefined") {
            unlockProgress.itemProgress[item.type] = amountCommitted + amountToAdd;
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

   if (tribeComponent.tribe.techIsComplete(tech)) {
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
   const structureComponent = StructureComponentArray.getComponent(spikes.id);
   
   // Can only cover non-covered floor spikes
   if (spikesComponent.isCovered || isAttachedToWall(structureComponent)) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   if (countItemType(inventoryComponent, ItemType.leaf) < 5) {
      return;
   }

   consumeItemType(inventoryComponent, ItemType.leaf, 5);

   spikesComponent.isCovered = true;
}

const modifyPlanterBox = (player: Entity, planterBox: Entity, plantType: PlanterBoxPlant): void => {
   // Don't place plant if there's already a plant
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox.id);
   if (typeof Board.entityRecord[planterBoxComponent.plantEntityID] !== "undefined") {
      return;
   }
   
   placePlantInPlanterBox(planterBox, plantType);

   // Consume the item
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);
   const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
   const hotbarInventory = hotbarUseInfo.inventory;

   consumeItemFromSlot(hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
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
         if (data === -1) {
            const planterBoxComponent = PlanterBoxComponentArray.getComponent(buildingID);
            fertilisePlanterBox(planterBoxComponent);

            // Consume the item
            // @Cleanup: copy and paste
            const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);
            const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
            const hotbarInventory = hotbarUseInfo.inventory;
            consumeItemFromSlot(hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
         } else {
            modifyPlanterBox(player, building, data);
         }
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
   building.destroy();

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