import { getStringLengthBytes, Packet, PacketReader, PacketType } from "battletribes-shared/packets";
import PlayerClient from "./PlayerClient";
import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { BowItemInfo, ConsumableItemCategory, ConsumableItemInfo, getItemAttackInfo, InventoryName, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType } from "battletribes-shared/items/items";
import { TribeType } from "battletribes-shared/tribes";
import Layer from "../Layer";
import { getCurrentLimbState, getHeldItem, getHeldItemEntity, getLimbConfiguration, InventoryUseComponentArray, setLimbActions } from "../components/InventoryUseComponent";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { changeEntityLayer, TransformComponentArray } from "../components/TransformComponent";
import { recruitTribesman, TribeComponentArray } from "../components/TribeComponent";
import { startChargingSpear, startChargingBattleaxe, createPlayerConfig, modifyBuilding, startChargingBow } from "../entities/tribes/player";
import { placeBlueprint, throwItem, useItem } from "../entities/tribes/tribe-member";
import { beginSwing } from "../entities/tribes/limb-use";
import { InventoryComponentArray, getInventory, addItemToInventory, addItemToSlot, consumeItemFromSlot, consumeItemTypeFromInventory, craftRecipe, inventoryComponentCanAffordRecipe, addItem, isRoomForItem } from "../components/InventoryComponent";
import { BlueprintType, BuildingMaterial, MATERIAL_TO_ITEM_MAP } from "battletribes-shared/components";
import { assert, Point, randAngle } from "battletribes-shared/utils";
import { generatePlayerSpawnPosition, getPlayerClients, registerDirtyEntity, registerPlayerDroppedItemPickup } from "./player-clients";
import { createItem } from "../items";
import { createEntity, destroyEntity, entityExists, getEntityLayer, getEntityType, getTribe } from "../world";
import { createCowConfig } from "../entities/mobs/cow";
import { SERVER } from "./server";
import { EntityConfig } from "../components";
import { createKrumblidConfig } from "../entities/mobs/krumblid";
import { CRAFTING_RECIPES, ItemRequirements } from "../../../shared/src/items/crafting-recipes";
import { surfaceLayer, undergroundLayer } from "../layers";
import { TileType } from "../../../shared/src/tiles";
import { toggleDoor } from "../components/DoorComponent";
import { toggleFenceGateDoor } from "../components/FenceGateComponent";
import { attemptToOccupyResearchBench, deoccupyResearchBench } from "../components/ResearchBenchComponent";
import { toggleTunnelDoor } from "../components/TunnelComponent";
import { Tech, TechID, getTechByID } from "../../../shared/src/techs";
import { CowComponentArray } from "../components/CowComponent";
import { dismountMount, mountCarrySlot, RideableComponentArray } from "../components/RideableComponent";
import { getTamingSkill, TamingSkillID, TamingTier } from "../../../shared/src/taming";
import { getTamingSkillLearning, skillLearningIsComplete, TamingComponentArray } from "../components/TamingComponent";
import { getTamingSpec } from "../taming-specs";
import { getHitboxTile, getHitboxVelocity, setHitboxAngle, setHitboxAngularVelocity } from "../hitboxes";
import { FloorSignComponentArray } from "../components/FloorSignComponent";
import { BLOCKING_LIMB_STATE, copyLimbState, RESTING_LIMB_STATES, SHIELD_BLOCKING_LIMB_STATE } from "../../../shared/src/attack-patterns";
import { updateBox } from "../../../shared/src/boxes/boxes";
import { BuildingMaterialComponentArray } from "../components/BuildingMaterialComponent";
import { createItemsOverEntity } from "../entities/item-entity";
import { TribesmanAIComponentArray } from "../components/TribesmanAIComponent";
import { TribesmanTitle } from "../../../shared/src/titles";
import { acceptTitleOffer, forceAddTitle, rejectTitleOffer, removeTitle, TribesmanComponentArray } from "../components/TribesmanComponent";
import Tribe from "../Tribe";
import { Settings } from "../../../shared/src/settings";
import { broadcastSimulationStatus, createSyncGameDataPacket } from "./packet-sending";
import { BarrelComponentArray } from "../components/BarrelComponent";
import { HeldItemComponentArray } from "../components/HeldItemComponent";

// @Speed: would be much faster in many-spectator cases if spectators instead sent their own kind of packets with only the things they need set
export function processPlayerDataPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const x = reader.readNumber();
   const y = reader.readNumber();
   const angle = reader.readNumber();

   const previousX = reader.readNumber();
   const previousY = reader.readNumber();

   const accelerationX = reader.readNumber();
   const accelerationY = reader.readNumber();

   const movementIntentionX = reader.readNumber();
   const movementIntentionY = reader.readNumber();

   // @HACK just made this not set "playerHitbox.previousRelativeAngle" to fix the overshooting
   const previousRelativeAngle = reader.readNumber();
   const angularAcceleration = reader.readNumber();

   const screenWidth = reader.readNumber();
   const screenHeight = reader.readNumber();
   
   const selectedHotbarItemSlot = reader.readNumber();
   const mainAction = reader.readNumber() as LimbAction;
   const offhandAction = reader.readNumber() as LimbAction;

   const interactingEntityID = reader.readNumber();
   const gameDataOptions = reader.readNumber();

   playerClient.screenWidth = screenWidth;
   playerClient.screenHeight = screenHeight;
   playerClient.updatePosition(x, y);
   playerClient.gameDataOptions = gameDataOptions;
   
   const player = playerClient.instance;
   if (entityExists(player)) {
      const transformComponent = TransformComponentArray.getComponent(player);
      const tribesmanComponent = TribesmanComponentArray.getComponent(player);
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

      const playerHitbox = transformComponent.hitboxes[0];

      playerHitbox.previousPosition.x = previousX;
      playerHitbox.previousPosition.y = previousY;

      // Cuz i've got a thing going on where if a hitbox is carried, then it can't have any acceleration. and if it does then the game will crash when it tries to detach from its parent.
      if (playerHitbox.parent === null) {
         playerHitbox.acceleration.x = accelerationX;
         playerHitbox.acceleration.y = accelerationY;
      }
      
      tribesmanComponent.movementIntention.x = movementIntentionX;
      tribesmanComponent.movementIntention.y = movementIntentionY;

      playerHitbox.angularAcceleration = angularAcceleration;

      const hotbarLimbInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   
      registerDirtyEntity(player);
      playerHitbox.box.position.x = x;
      playerHitbox.box.position.y = y;
      
      setHitboxAngle(playerHitbox, angle);
      
      if (playerHitbox.parent !== null) {
         updateBox(playerHitbox.box, playerHitbox.parent.box);
      } else {
         playerHitbox.box.angle = playerHitbox.box.relativeAngle;
      }
      
      // @Hack
      // if (playerHitbox.parent === null) {
      //    playerHitbox.box.angle = angle;
      //    playerHitbox.box.relativeAngle = angle;

      //    playerHitbox.previousRelativeAngle = angle;
      // } else {
      //    // @HACK cuz this is reaaally broken right now and i dont know what to do D:
      //    playerHitbox.box.relativeAngle = angle;
      //    playerHitbox.previousRelativeAngle = angle;
      // }
      // @HACK im doing this rn so it stops overshooting but will need to be properly fixed at some point
      setHitboxAngularVelocity(playerHitbox, 0);

      
      transformComponent.isDirty = true;
      
      if (selectedHotbarItemSlot !== hotbarLimbInfo.selectedItemSlot) {
         hotbarLimbInfo.selectedItemSlot = selectedHotbarItemSlot;
         registerDirtyEntity(player);
      }

      const playerComponent = PlayerComponentArray.getComponent(player);
      playerComponent.interactingEntityID = interactingEntityID;

      // @Bug: won't work for using medicine in offhand
      let overrideOffhand = false;
      
      // @CLEANUP @HACK
      if (mainAction === LimbAction.chargeSpear && hotbarLimbInfo.action !== LimbAction.chargeSpear) {
         startChargingSpear(playerClient.instance, InventoryName.hotbar);
      } else if (mainAction === LimbAction.chargeBattleaxe && hotbarLimbInfo.action !== LimbAction.chargeBattleaxe) {
         startChargingBattleaxe(playerClient.instance, InventoryName.hotbar);
      } else if (mainAction === LimbAction.engageBow && hotbarLimbInfo.action !== LimbAction.engageBow) {
         startChargingBow(playerClient.instance);
      }

      if (!overrideOffhand) {
         const tribeComponent = TribeComponentArray.getComponent(player);
         if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
            const offhandLimbInfo = inventoryUseComponent.getLimbInfo(InventoryName.offhand);

            if (offhandAction === LimbAction.chargeSpear && offhandLimbInfo.action !== LimbAction.chargeSpear) {
               startChargingSpear(playerClient.instance, InventoryName.offhand);
            } else if (offhandAction === LimbAction.chargeBattleaxe && offhandLimbInfo.action !== LimbAction.chargeBattleaxe) {
               startChargingBattleaxe(playerClient.instance, InventoryName.offhand);
            }
         }
      }
   }
}

// @Cleanup: most of this logic and that in attemptSwing should be done in tribe-member.ts
export function processPlayerAttackPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemSlot = reader.readNumber();
   // @Cleanup: unused?
   const attackDirection = reader.readNumber();
   
   // const didSwingWithRightHand = attemptSwing(player, targets, itemSlot, InventoryName.hotbar);
   const didSwingWithRightHand = beginSwing(player, itemSlot, InventoryName.hotbar);
   if (didSwingWithRightHand) {
      return;
   }

   // If a barbarian, attack with offhand
   const tribeComponent = TribeComponentArray.getComponent(player);
   if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
      // attemptSwing(player, targets, 1, InventoryName.offhand);
      beginSwing(player, 1, InventoryName.offhand);
   }
}

export function processDevGiveItemPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemType = reader.readNumber() as ItemType;
   const amount = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   addItemToInventory(player, inventory, createItem(itemType, amount, "", ""));
}

export function processRespawnPacket(playerClient: PlayerClient): void {
   // Calculate spawn position
   let spawnPosition: Point;
   let layer: Layer;

   const totems = playerClient.tribe.getEntitiesByType(EntityType.tribeTotem);
   if (totems.length > 0) {
      const totem = totems[0];

      const totemTransformComponent = TransformComponentArray.getComponent(totem);
      const totemHitbox = totemTransformComponent.hitboxes[0];
      
      spawnPosition = totemHitbox.box.position.copy();
      const offsetDirection = randAngle();
      spawnPosition.x += 100 * Math.sin(offsetDirection);
      spawnPosition.y += 100 * Math.cos(offsetDirection);
      layer = getEntityLayer(totem);
   } else {
      spawnPosition = generatePlayerSpawnPosition(playerClient.tribe.tribeType);
      layer = surfaceLayer;
   }

   const config = createPlayerConfig(spawnPosition, 0, playerClient.tribe, playerClient);
   createEntity(config, layer, 0);

   // (The PlayerComponent onJoin function will send the packet with all the information)
}

export function processStartItemUsePacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemSlot = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.getItem(itemSlot);
   if (item === null) {
      return;
   }

   // Block with the item if possible
   const attackInfo = getItemAttackInfo(item.type);
   if (attackInfo.attackTimings.blockTimeTicks !== null) {
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
      const limb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
      
      const initialLimbState = getCurrentLimbState(limb);

      // @Cleanup: unneeded?
      limb.selectedItemSlot = itemSlot;
      
      // Begin blocking
      limb.action = LimbAction.engageBlock;
      limb.currentActionElapsedTicks = 0;
      limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks;
      limb.currentActionRate = 1;
      // @Speed: why are we copying?
      limb.currentActionStartLimbState = copyLimbState(initialLimbState);
      limb.currentActionEndLimbState = item.type !== null && ITEM_TYPE_RECORD[item.type] === "shield" ? SHIELD_BLOCKING_LIMB_STATE : BLOCKING_LIMB_STATE;
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const limb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   
   switch (ITEM_TYPE_RECORD[item.type]) {
      case "healing": {
         // Reset the food timer so that the food isn't immediately eaten
         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;
         limb.foodEatingTimer = itemInfo.consumeTime;
   
         // @Incomplete
         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            setLimbActions(inventoryUseComponent, LimbAction.useMedicine);
         }
         
         limb.action = LimbAction.eat;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionRate = 1;
         break;
      }
      case "bow": {
         for (let i = 0; i < 2; i++) {
            const limb = inventoryUseComponent.getLimbInfo(i === 0 ? InventoryName.hotbar : InventoryName.offhand);
            limb.action = LimbAction.chargeBow;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = (ITEM_INFO_RECORD[item.type] as BowItemInfo).shotChargeTimeTicks;
            limb.currentActionRate = 1;
         }
         break;
      }
   }
}

export function processUseItemPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemSlot = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.itemSlots[itemSlot];
   if (typeof item !== "undefined")  {
      useItem(playerClient.instance, item, InventoryName.hotbar, itemSlot);
   }
}

export function processStopItemUsePacket(playerClient: PlayerClient): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

   const limb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   // If the limb isn't using an item, stop
   if (limb.action === LimbAction.none) {
      return;
   }

   // If the limb was blocking, deactivate the block box
   if (limb.action === LimbAction.block) {
      // @Copynpaste
      const heldItem = getHeldItem(limb);
      const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);

      const heldItemEntity = getHeldItemEntity(limb);
      assert(heldItemEntity !== null);
      const heldItemComponent = HeldItemComponentArray.getComponent(heldItemEntity);

      const hasBlocked = heldItemComponent.hasBlocked;
      
      const initialLimbState = getCurrentLimbState(limb);
      
      limb.action = LimbAction.returnBlockToRest;
      limb.currentActionElapsedTicks = 0;
      // @Temporary? Perhaps use separate blockReturnTimeTicks.
      limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.blockTimeTicks!;
      limb.currentActionRate = hasBlocked ? 2 : 1;
      limb.currentActionStartLimbState = copyLimbState(initialLimbState);
      limb.currentActionEndLimbState = RESTING_LIMB_STATES[getLimbConfiguration(inventoryUseComponent)];
   } else {
      limb.action = LimbAction.none;
   }

   registerDirtyEntity(player);
}

export function processItemDropPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const inventoryName = reader.readNumber() as InventoryName;
   const itemSlot = reader.readNumber();
   const dropAmount = reader.readNumber();
   const throwDirection = reader.readNumber();
   throwItem(playerClient.instance, inventoryName, itemSlot, dropAmount, throwDirection);
}

export function processItemPickupPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   if (!entityExists(entity)) {
      return;
   }
   const inventoryName = reader.readNumber() as InventoryName;
   const itemSlot = reader.readNumber();
   const amount = reader.readNumber();
   
   const playerInventoryComponent = InventoryComponentArray.getComponent(player);
   const heldItemInventory = getInventory(playerInventoryComponent, InventoryName.heldItemSlot);
   
   // Don't pick up the item if there is already a held item
   if (typeof heldItemInventory.itemSlots[1] !== "undefined") {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entity);
   const targetInventory = getInventory(targetInventoryComponent, inventoryName);

   const pickedUpItem = targetInventory.itemSlots[itemSlot];
   if (typeof pickedUpItem === "undefined") {
      return;
   }

   // Remove the item from its previous inventory
   const amountConsumed = consumeItemFromSlot(entity, targetInventory, itemSlot, amount);

   // Hold the item
   // Copy it as the consumeItemFromSlot function modifies the original item's count
   const heldItem = createItem(pickedUpItem.type, amountConsumed, pickedUpItem.nickname, pickedUpItem.namer);
   heldItemInventory.addItem(heldItem, 1);
}

export function processItemTransferPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const givingEntity = reader.readNumber() as Entity;
   if (!entityExists(givingEntity)) {
      return;
   }
   const givingInventoryName = reader.readNumber() as InventoryName;
   const itemSlot = reader.readNumber();

   const receivingEntity: Entity = reader.readNumber();
   const receivingInventoryName = reader.readNumber() as InventoryName;

   // Make sure it's actually a transfer between the player and something
   if (givingEntity !== player && receivingEntity !== player) {
      return;
   }
   
   const givingInventoryComponent = InventoryComponentArray.getComponent(givingEntity);
   const givingInventory = getInventory(givingInventoryComponent, givingInventoryName);
   
   const receivingInventoryComponent = InventoryComponentArray.getComponent(receivingEntity);
   const receivingInventory = getInventory(receivingInventoryComponent, receivingInventoryName);
   
   const transferredItem = givingInventory.itemSlots[itemSlot];
   if (typeof transferredItem === "undefined") {
      return;
   }

   givingInventory.removeItem(itemSlot);
   if (isRoomForItem(receivingInventory, transferredItem)) {
      addItemToInventory(receivingEntity, receivingInventory, transferredItem);
   }
}

export function processItemReleasePacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   if (!entityExists(entity)) {
      return;
   }
   const inventoryName = reader.readNumber() as InventoryName;
   const itemSlot = reader.readNumber();
   const amount = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   
   // Don't release an item if there is no held item
   const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const heldItem = heldItemInventory.itemSlots[1];
   if (typeof heldItem === "undefined") {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entity);

   // Add the item to the inventory
   // Have to use a copy so that the consumeItemTypeFromInventory function doesn't remove from the new item's count!
   const amountAdded = addItemToSlot(entity, targetInventoryComponent, inventoryName, itemSlot, createItem(heldItem.type, heldItem.count, heldItem.nickname, heldItem.namer), amount);

   // If all of the item was added, clear the held item
   consumeItemTypeFromInventory(entity, inventoryComponent, InventoryName.heldItemSlot, heldItem.type, amountAdded);
}

export function processEntitySummonPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const entityType = reader.readNumber() as EntityType;
   const x = reader.readNumber();
   const y = reader.readNumber();
   const rotation = reader.readNumber();

   // @Hack
   let config: EntityConfig;
   switch (entityType) {
      case EntityType.cow: {
         config = createCowConfig(new Point(x, y), rotation, 0);
         break;
      }
      case EntityType.krumblid: {
         config = createKrumblidConfig(new Point(x, y), rotation);
         break;
      }
      default: {
         console.warn("Can't summon entity!");
         return;
      }
   }
   createEntity(config, playerClient.lastLayer, 0);
}

export function processToggleSimulationPacket(playerClient: PlayerClient, reader: PacketReader): void {
   SERVER.isSimulating = reader.readBool();
   broadcastSimulationStatus(SERVER.isSimulating);
}

// @Cleanup: name, and there is already a shared definition
const snapRotationToPlayer = (player: Entity, placePosition: Point, rotation: number): number => {
   const transformComponent = TransformComponentArray.getComponent(player);
   const playerHitbox = transformComponent.hitboxes[0];
   
   const playerDirection = playerHitbox.box.position.angleTo(placePosition);
   let snapRotation = playerDirection - rotation;

   // Snap to nearest PI/2 interval
   snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

   snapRotation += rotation;
   return snapRotation;
}

export function processPlaceBlueprintPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const structure = reader.readNumber() as Entity;
   const blueprintType = reader.readNumber() as BlueprintType;
   
   if (!entityExists(playerClient.instance) || !entityExists(structure)) {
      return;
   }

   // @Cleanup: should not do this logic here.
   const structureTransformComponent = TransformComponentArray.getComponent(structure);
   const structureHitbox = structureTransformComponent.hitboxes[0];
   const rotation = snapRotationToPlayer(playerClient.instance, structureHitbox.box.position, structureHitbox.box.angle);
   placeBlueprint(playerClient.instance, structure, blueprintType, rotation);
}

export function processPlayerCraftingPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }
   
   const recipeIndex = reader.readNumber();
   if (recipeIndex < 0 || recipeIndex >= CRAFTING_RECIPES.length) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const craftingRecipe = CRAFTING_RECIPES[recipeIndex];

   // @Incomplete: Check that the player is interacting with the necessary crafting station

   if (inventoryComponentCanAffordRecipe(inventoryComponent, craftingRecipe, InventoryName.craftingOutputSlot)) {
      craftRecipe(player, inventoryComponent, craftingRecipe, InventoryName.craftingOutputSlot);
   }
}

export function processAscendPacket(playerClient: PlayerClient): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const currentLayer = getEntityLayer(player);
   if (currentLayer === undergroundLayer) {
      const transformComponent = TransformComponentArray.getComponent(player);
      const playerHitbox = transformComponent.hitboxes[0];
      const tileAbove = getHitboxTile(playerHitbox);
      if (surfaceLayer.getTileType(tileAbove) === TileType.dropdown) {
         changeEntityLayer(player, surfaceLayer);
      }
   }
}

export function processTPToEntityPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const targetEntity = reader.readNumber() as Entity;

   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   const targetHitbox = targetTransformComponent.hitboxes[0];

   const packet = new Packet(PacketType.forcePositionUpdate, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(targetHitbox.box.position.x);
   packet.writeNumber(targetHitbox.box.position.y);
   playerClient.socket.send(packet.buffer);
}

export function processSpectateEntityPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const entity: Entity = reader.readNumber();
   if (entityExists(entity)) {
      playerClient.cameraSubject = entity;
   }
}

export function processSetAutogiveBaseResourcesPacket(reader: PacketReader): void {
   const tribeID = reader.readNumber();
   const autogiveBaseResources = reader.readBool();

   const tribe = getTribe(tribeID);
   if (tribe !== null) {
      tribe.autogiveBaseResources = autogiveBaseResources;
   }
}

export function processStructureInteractPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const structure = reader.readNumber() as Entity;
   if (!entityExists(structure)) {''
      return;
   }

   const interactData = reader.readNumber();

   switch (getEntityType(structure)) {
      case EntityType.door: {
         toggleDoor(structure);
         break;
      }
      case EntityType.researchBench: {
         attemptToOccupyResearchBench(structure, playerClient.instance);
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

const itemIsNeededInTech = (tech: Tech, itemRequirements: ItemRequirements, itemType: ItemType): boolean => {
   // If the item isn't present in the item requirements then it isn't needed
   const amountNeeded = tech.researchItemRequirements.getItemCount(itemType);
   if (amountNeeded === 0) {
      return false;
   }
   
   const amountCommitted = itemRequirements[itemType] || 0;
   return amountCommitted < amountNeeded;
}

export function processTechUnlockPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const techID = reader.readNumber() as TechID;

   const tech = getTechByID(techID);
   
   const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);

   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   
   // Consume any available items
   for (let i = 0; i < hotbarInventory.items.length; i++) {
      const item = hotbarInventory.items[i];

      const itemProgress = tribeComponent.tribe.techTreeUnlockProgress[techID]?.itemProgress || {};
      if (itemIsNeededInTech(tech, itemProgress, item.type)) {
         const amountNeeded = tech.researchItemRequirements.getItemCount(item.type);
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
      tribeComponent.tribe.unlockTech(tech);
   }
}

export function processSelectTechPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const techID = reader.readNumber() as TechID;

   playerClient.tribe.selectedTechID = techID;
}

export function processTechStudyPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const studyAmount = reader.readNumber();

   const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
   
   if (tribeComponent.tribe.selectedTechID !== null) {
      const transformComponent = TransformComponentArray.getComponent(playerClient.instance);
      const playerHitbox = transformComponent.hitboxes[0];

      const selectedTech = getTechByID(tribeComponent.tribe.selectedTechID);
      playerClient.tribe.studyTech(selectedTech, playerHitbox.box.position.x, playerHitbox.box.position.y, studyAmount);
   }
}

export function processAnimalStaffFollowCommandPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   if (!entityExists(entity)) {
      return;
   }

   const tamingComponent = TamingComponentArray.getComponent(entity);
   // Toggle the follow target
   if (!entityExists(tamingComponent.followTarget)) {
      tamingComponent.followTarget = playerClient.instance;
   } else {
      tamingComponent.followTarget = 0;
   }
}

export function processMountCarrySlotPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const mount = reader.readNumber() as Entity;
   if (!entityExists(mount)) {
      return;
   }

   const carrySlotIdx = reader.readNumber();

   const rideableComponent = RideableComponentArray.getComponent(mount);
   const carrySlot = rideableComponent.carrySlots[carrySlotIdx];
   mountCarrySlot(player, carrySlot);
}

export function receiveSelectRiderDepositLocation(reader: PacketReader): void {
   const mount = reader.readNumber() as Entity;
   if (!entityExists(mount)) {
      return;
   }

   const depositLocation = reader.readPoint();

   if (!TamingComponentArray.hasComponent(mount)) {
      return;
   }
   const tamingComponent = TamingComponentArray.getComponent(mount);

   tamingComponent.depositTarget = depositLocation;
}

export function processDismountCarrySlotPacket(playerClient: PlayerClient): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(player);
   const playerHitbox = transformComponent.hitboxes[0];
   if (playerHitbox.parent !== null) {
      dismountMount(player, playerHitbox.parent.entity);
   }
}

export function processPickUpEntityPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const entity: Entity = reader.readNumber();
   if (!entityExists(entity)) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   switch (getEntityType(entity)) {
      case EntityType.woodenArrow: {
         if (getHitboxVelocity(hitbox).magnitude() < 1) {
            destroyEntity(entity);
            
            const inventoryComponent = InventoryComponentArray.getComponent(player);
            addItem(player, inventoryComponent, createItem(ItemType.woodenArrow, 1, "", ""));
            // @Hack: should be detected in addItem or something. shuldn't have to be manually done at the place of calling, yknow?
            registerPlayerDroppedItemPickup(player);
         }
         break;
      }
      case EntityType.dustfleaEgg: {
         // @Copynpaste

         destroyEntity(entity);

         const inventoryComponent = InventoryComponentArray.getComponent(player);
         addItem(player, inventoryComponent, createItem(ItemType.dustfleaEgg, 1, "", ""));
         // @Hack: should be detected in addItem or something. shuldn't have to be manually done at the place of calling, yknow?
         registerPlayerDroppedItemPickup(player);
         break;
      }
   }
}

export function processModifyBuildingPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const structure: Entity = reader.readNumber();
   if (!entityExists(structure)) {
      return;
   }
   
   const data = reader.readNumber();
   
   modifyBuilding(playerClient.instance, structure, data);
}

export function processSetMoveTargetPositionPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   } 

   const entity: Entity = reader.readNumber();
   if (!entityExists(entity)) {
      return;
   }
   
   const targetX = reader.readNumber();
   const targetY = reader.readNumber();
   
   if (!CowComponentArray.hasComponent(entity)) {
      return;
   }
   const cowComponent = CowComponentArray.getComponent(entity);

   cowComponent.targetMovePosition = new Point(targetX, targetY);
}

export function processSetCarryTargetPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity = reader.readNumber() as Entity;
   if (!entityExists(entity)) {
      return;
   }
   
   const carryTarget = reader.readNumber();
   
   if (!TamingComponentArray.hasComponent(entity)) {
      return;
   }
   const tamingComponent = TamingComponentArray.getComponent(entity);

   tamingComponent.carryTarget = carryTarget;
}

export function processSetAttackTargetPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity: Entity = reader.readNumber();
   if (!entityExists(entity)) {
      return;
   }
   
   const attackTarget = reader.readNumber();
   
   if (!TamingComponentArray.hasComponent(entity)) {
      return;
   }
   const tamingComponent = TamingComponentArray.getComponent(entity);

   tamingComponent.attackTarget = attackTarget;
}

export function processCompleteTamingTierPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity: Entity = reader.readNumber();
   if (!entityExists(entity)) {
      return;
   }

   if (!TamingComponentArray.hasComponent(entity)) {
      return;
   }
   const tamingComponent = TamingComponentArray.getComponent(entity);

   // @Hack
   const foodRequired: number | undefined = getTamingSpec(entity).tierFoodRequirements[(tamingComponent.tamingTier + 1) as TamingTier];
   if (typeof foodRequired !== "undefined" && tamingComponent.foodEatenInTier >= foodRequired) {
      // @Cleanup @Copynpaste
      tamingComponent.tamingTier++;
      tamingComponent.foodEatenInTier = 0;
      tamingComponent.tameTribe = playerClient.tribe;
   }
}

export function processForceCompleteTamingTierPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity: Entity = reader.readNumber();
   if (!entityExists(entity)) {
      return;
   }
   
   const tamingComponent = TamingComponentArray.getComponent(entity);
   // @Cleanup @Copynpaste
   tamingComponent.tamingTier++;
   tamingComponent.foodEatenInTier = 0;
   tamingComponent.tameTribe = playerClient.tribe;
}

export function processAcquireTamingSkillPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity: Entity = reader.readNumber();
   if (!entityExists(entity)) {
      return;
   }
   
   const skillID = reader.readNumber() as TamingSkillID;
   
   const tamingComponent = TamingComponentArray.getComponent(entity);
   const skillLearning = getTamingSkillLearning(tamingComponent, skillID);
   if (skillLearning !== null && skillLearningIsComplete(skillLearning)) {
      const skill = getTamingSkill(skillID);
      tamingComponent.acquiredSkills.push(skill);
   }
}

export function processForceAcquireTamingSkillPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const entity: Entity = reader.readNumber();
   if (!entityExists(entity)) {
      return;
   }

   const skillID = reader.readNumber() as TamingSkillID;
   
   const skill = getTamingSkill(skillID);
   
   const tamingComponent = TamingComponentArray.getComponent(entity);
   tamingComponent.acquiredSkills.push(skill);
}

export function processSetSpectatingPositionPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const x = reader.readNumber() as Entity;
   const y = reader.readNumber() as TamingSkillID;
   playerClient.updatePosition(x, y);
}

export function processDevSetViewedSpawnDistribution(playerClient: PlayerClient, reader: PacketReader): void {
   const entityType = reader.readNumber();
   playerClient.viewedSpawnDistribution = entityType;
}

export function processSetSignMessagePacket(reader: PacketReader): void {
   const entity = reader.readNumber();
   if (!entityExists(entity)) {
      return;
   }
   
   const message = reader.readString();

   const floorSignComponent = FloorSignComponentArray.getComponent(entity);
   floorSignComponent.message = message;
   registerDirtyEntity(entity);
}

export function processRenameAnimalPacket(reader: PacketReader): void {
   const entity = reader.readNumber();
   if (!entityExists(entity)) {
      
   }
   
   const name = reader.readString();

   if (!TamingComponentArray.hasComponent(entity)) {
      return;
   }

   const tamingComponent = TamingComponentArray.getComponent(entity);
   tamingComponent.name = name;
   registerDirtyEntity(entity);
}

export function receiveChatMessagePacket(reader: PacketReader, playerClient: PlayerClient): void {
   const message = reader.readString();

   const packet = new Packet(PacketType.serverToClientChatMessage, Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(playerClient.username) + getStringLengthBytes(message));
   packet.writeString(playerClient.username);
   packet.writeString(message);

   for (const playerClient of getPlayerClients()) {
      playerClient.socket.send(packet.buffer);
   }
}

export function processForceUnlockTechPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const techID: TechID = reader.readNumber();

   playerClient.tribe.forceUnlockTech(getTechByID(techID));
}

export function processDeconstructBuildingPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const structure: Entity = reader.readNumber();
   if (!entityExists(structure)) {
      return;
   }

   // Deconstruct
   destroyEntity(structure);

   if (BuildingMaterialComponentArray.hasComponent(structure)) {
      const materialComponent = BuildingMaterialComponentArray.getComponent(structure);
      
      if (getEntityType(structure) === EntityType.wall && materialComponent.material === BuildingMaterial.wood) {
         createItemsOverEntity(structure, ItemType.wooden_wall, 1);
         return;
      }
      
      const materialItemType = MATERIAL_TO_ITEM_MAP[materialComponent.material];
      createItemsOverEntity(structure, materialItemType, 5);
   }
}

export function processStructureUninteractPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const structure: Entity = reader.readNumber();
   if (!entityExists(structure)) {
      return;
   }

   switch (getEntityType(structure)) {
      case EntityType.researchBench: {
         deoccupyResearchBench(structure, playerClient.instance);
         break;
      }
   }
}

export function processRecruitTribesmanPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const tribesman: Entity = reader.readNumber();
   if (!entityExists(tribesman)) {
      return;
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   const relation = tribesmanComponent.tribesmanRelations[playerClient.instance];
   if (typeof relation !== "undefined" && relation >= 50) {
      const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
      
      recruitTribesman(tribesman, tribeComponent.tribe);
   }
}

export function processRespondToTitleOfferPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const title: TribesmanTitle = reader.readNumber();
   const isAccepted = reader.readBool();
   
   if (isAccepted) {
      acceptTitleOffer(playerClient.instance, title);
   } else {
      rejectTitleOffer(playerClient.instance, title);
   }
}

export function processDevGiveTitlePacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const title: TribesmanTitle = reader.readNumber();
   forceAddTitle(player, title);
}

export function processDevRemoveTitlePacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const title: TribesmanTitle = reader.readNumber();
   removeTitle(player, title);
}

export function processDevCreateTribePacket(): void {
   new Tribe(TribeType.plainspeople, true, new Point(Settings.WORLD_UNITS * 0.5, Settings.WORLD_UNITS * 0.5));
}

export function processDevChangeTribeTypePacket(reader: PacketReader): void {
   const tribeID = reader.readNumber();
   const newTribeType: TribeType = reader.readNumber();
   
   const tribe = getTribe(tribeID);
   if (tribe !== null) {
      tribe.tribeType = newTribeType;
   }
}

export function processOpenEntityInventoryPacket(reader: PacketReader): void {
   const entity: Entity = reader.readNumber();
   
   if (BarrelComponentArray.hasComponent(entity)) {
      const barrelComponent = BarrelComponentArray.getComponent(entity);
      if (!barrelComponent.openers.includes(entity)) {
         barrelComponent.openers.push(entity);
         if (barrelComponent.openers.length === 1) {
            registerDirtyEntity(entity);
         }
      }
   }
}

export function processCloseEntityInventoryPacket(reader: PacketReader): void {
   const entity: Entity = reader.readNumber();
   
   if (BarrelComponentArray.hasComponent(entity)) {
      const barrelComponent = BarrelComponentArray.getComponent(entity);
      const idx = barrelComponent.openers.indexOf(entity);
      if (idx !== -1) {
         barrelComponent.openers.splice(idx, 1);
         if (barrelComponent.openers.length === 0) {
            registerDirtyEntity(entity);
         }
      }
   }
}

export function processSyncRequestPacket(playerClient: PlayerClient): void {
   const buffer = createSyncGameDataPacket(playerClient);
   playerClient.socket.send(buffer);

   // Restart sending packets to the client
   playerClient.isActive = true;
}

export function processActivatePacket(playerClient: PlayerClient): void {
   playerClient.isActive = true;
}

export function processDeactivatePacket(playerClient: PlayerClient): void {
   playerClient.isActive = false;
}

export function processSetDebugEntityPacket(reader: PacketReader): void {
   const entity: Entity = reader.readNumber();
   // @Cleanup: shouldn't be in the server!
   SERVER.setTrackedGameObject(entity);
}