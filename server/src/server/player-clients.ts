import { PlayerDataPacket, AttackPacket, RespawnDataPacket, HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData } from "webgl-test-shared/dist/client-server-types";
import { BlueprintType, BuildingMaterial, MATERIAL_TO_ITEM_MAP, ServerComponentType } from "webgl-test-shared/dist/components";
import { TechID, TechInfo, getTechByID } from "webgl-test-shared/dist/techs";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import Board from "../Board";
import { registerCommand } from "../commands";
import { TribeMemberComponentArray, acceptTitleOffer, forceAddTitle, rejectTitleOffer, removeTitle } from "../components/TribeMemberComponent";
import { modifyBuilding, startChargingBattleaxe, startChargingBow, startChargingSpear, startEating, createPlayer } from "../entities/tribes/player";
import { throwItem, placeBlueprint, attemptAttack, calculateAttackTarget, calculateBlueprintWorkTarget, calculateRadialAttackTargets, calculateRepairTarget, repairBuilding, getAvailableCraftingStations, useItem } from "../entities/tribes/tribe-member";
import PlayerClient from "./PlayerClient";
import { SERVER } from "./server";
import { createGameDataSyncPacket, createInitialGameDataPacket } from "./game-data-packets";
import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { TRIBE_INFO_RECORD, TribeType } from "webgl-test-shared/dist/tribes";
import { InventoryUseComponentArray, getInventoryUseInfo } from "../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import Entity from "../Entity";
import { InventoryComponentArray, addItemToInventory, addItemToSlot, consumeItemFromSlot, consumeItemTypeFromInventory, craftRecipe, getInventory, inventoryComponentCanAffordRecipe, recipeCraftingStationIsAvailable } from "../components/InventoryComponent";
import { EntityRelationship, TribeComponentArray, recruitTribesman } from "../components/TribeComponent";
import { createItem } from "../items";
import { Point, randInt, randItem } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import { getTilesOfBiome } from "../census";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { attemptToOccupyResearchBench, deoccupyResearchBench } from "../components/ResearchBenchComponent";
import { toggleDoor } from "../components/DoorComponent";
import { toggleFenceGateDoor } from "../components/FenceGateComponent";
import { toggleTunnelDoor } from "../components/TunnelComponent";
import { createItemsOverEntity } from "../entity-shared";
import { BuildingMaterialComponentArray } from "../components/BuildingMaterialComponent";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { TurretComponentArray } from "../components/TurretComponent";
import { TribesmanAIComponentArray } from "../components/TribesmanAIComponent";
import { EntitySummonPacket } from "webgl-test-shared/dist/dev-packets";
import { createBallista } from "../entities/structures/ballista";
import { createEmptyStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createZombie } from "../entities/mobs/zombie";
import { createTribeWarrior } from "../entities/tribes/tribe-warrior";
import { createTribeWorker } from "../entities/tribes/tribe-worker";
import { CRAFTING_RECIPES, ItemRequirements } from "webgl-test-shared/dist/items/crafting-recipes";
import { InventoryName, Item, ITEM_TYPE_RECORD, ItemType } from "webgl-test-shared/dist/items/items";
import { createFrozenYeti } from "../entities/mobs/frozen-yeti";
import Tribe from "../Tribe";
import { EntityTickEvent } from "webgl-test-shared/dist/entity-events";

// @Cleanup: see if a decorator can be used to cut down on the player entity check copy-n-paste

/** Minimum number of units away from the border that the player will spawn at */
const PLAYER_SPAWN_POSITION_PADDING = 300;

/** How far away from the entity the attack is done */
const ATTACK_OFFSET = 50;
/** Max distance from the attack position that the attack will be registered from */
const ATTACK_RADIUS = 50;

const playerClients = new Array<PlayerClient>();

export function getPlayerClients(): ReadonlyArray<PlayerClient> {
   return playerClients;
}

const getPlayerClientFromInstanceID = (instanceID: number): PlayerClient | null => {
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];

      if (playerClient.instanceID === instanceID) {
         return playerClient;
      }
   }

   return null;
}

// @Cleanup: better to be done by the player component array
export function getPlayerFromUsername(username: string): Entity | null {
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];

      if (playerClient.username === username) {
         const instance = Board.entityRecord[playerClient.instanceID];
         if (typeof instance !== "undefined") {
            return instance;
         }
      }
   }

   return null;
}

const handlePlayerDisconnect = (playerClient: PlayerClient): void => {
   // Remove player client
   const idx = playerClients.indexOf(playerClient);
   if (idx !== -1) {
      playerClients.splice(idx, 1);
   } else {
      console.warn("Could not find the player client.");
   }

   // Kill the player
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player !== "undefined") {
      player.destroy();
   }
}

const sendGameDataSyncPacket = (playerClient: PlayerClient): void => {
   const packet = createGameDataSyncPacket(playerClient);
   playerClient.socket.emit("game_data_sync_packet", packet);
}

// @Cleanup: Messy as fuck
const processPlayerDataPacket = (playerClient: PlayerClient, playerDataPacket: PlayerDataPacket): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);
   const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);

   player.position.x = playerDataPacket.position[0];
   player.position.y = playerDataPacket.position[1];
   player.rotation = playerDataPacket.rotation;

   playerClient.visibleChunkBounds = playerDataPacket.visibleChunkBounds;
   playerClient.gameDataOptions = playerDataPacket.gameDataOptions;
   
   const physicsComponent = PhysicsComponentArray.getComponent(player.id);
   physicsComponent.hitboxesAreDirty = true;
   
   physicsComponent.velocity.x = playerDataPacket.velocity[0];
   physicsComponent.velocity.y = playerDataPacket.velocity[1];
   physicsComponent.acceleration.x = playerDataPacket.acceleration[0];
   physicsComponent.acceleration.y = playerDataPacket.acceleration[1];
   
   hotbarUseInfo.selectedItemSlot = playerDataPacket.selectedItemSlot;

   const playerComponent = PlayerComponentArray.getComponent(player.id);
   playerComponent.interactingEntityID = playerDataPacket.interactingEntityID !== null ? playerDataPacket.interactingEntityID : 0;

   // @Bug: won't work for using medicine in offhand
   let overrideOffhand = false;
   
   if ((playerDataPacket.mainAction === LimbAction.eat || playerDataPacket.mainAction === LimbAction.useMedicine) && (hotbarUseInfo.action !== LimbAction.eat && hotbarUseInfo.action !== LimbAction.useMedicine)) {
      overrideOffhand = startEating(player, InventoryName.hotbar);
   } else if (playerDataPacket.mainAction === LimbAction.chargeBow && hotbarUseInfo.action !== LimbAction.chargeBow) {
      startChargingBow(player, InventoryName.hotbar);
   } else if (playerDataPacket.mainAction === LimbAction.chargeSpear && hotbarUseInfo.action !== LimbAction.chargeSpear) {
      startChargingSpear(player, InventoryName.hotbar);
   } else if (playerDataPacket.mainAction === LimbAction.chargeBattleaxe && hotbarUseInfo.action !== LimbAction.chargeBattleaxe) {
      startChargingBattleaxe(player, InventoryName.hotbar);
   } else {
      hotbarUseInfo.action = playerDataPacket.mainAction;
   }

   if (!overrideOffhand) {
      const tribeComponent = TribeComponentArray.getComponent(player.id);
      if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
         const offhandUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.offhand);

         if ((playerDataPacket.offhandAction === LimbAction.eat || playerDataPacket.offhandAction === LimbAction.useMedicine) && (offhandUseInfo.action !== LimbAction.eat && offhandUseInfo.action !== LimbAction.useMedicine)) {
            startEating(player, InventoryName.offhand);
         } else if (playerDataPacket.offhandAction === LimbAction.chargeBow && offhandUseInfo.action !== LimbAction.chargeBow) {
            startChargingBow(player, InventoryName.offhand);
         } else if (playerDataPacket.offhandAction === LimbAction.chargeSpear && offhandUseInfo.action !== LimbAction.chargeSpear) {
            startChargingSpear(player, InventoryName.offhand);
         } else if (playerDataPacket.offhandAction === LimbAction.chargeBattleaxe && offhandUseInfo.action !== LimbAction.chargeBattleaxe) {
            startChargingBattleaxe(player, InventoryName.offhand);
         } else {
            offhandUseInfo.action = playerDataPacket.offhandAction;
         }
      }
   }
}

export function generatePlayerSpawnPosition(tribeType: TribeType): Point {
   const tribeInfo = TRIBE_INFO_RECORD[tribeType];
   for (let numAttempts = 0; numAttempts < 50; numAttempts++) {
      const biomeName = randItem(tribeInfo.biomes);
      const biomeTiles = getTilesOfBiome(biomeName);
      if (biomeTiles.length === 0) {
         continue;
      }

      const tile = randItem(biomeTiles);

      const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
      const y = (tile.y + Math.random()) * Settings.TILE_SIZE;

      if (x < PLAYER_SPAWN_POSITION_PADDING || x >= Settings.BOARD_UNITS - PLAYER_SPAWN_POSITION_PADDING || y < PLAYER_SPAWN_POSITION_PADDING || y >= Settings.BOARD_UNITS - PLAYER_SPAWN_POSITION_PADDING) {
         continue;
      }

      return new Point(x, y);
   }
   
   // If all else fails, just pick a random position
   const x = randInt(PLAYER_SPAWN_POSITION_PADDING, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - PLAYER_SPAWN_POSITION_PADDING);
   const y = randInt(PLAYER_SPAWN_POSITION_PADDING, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - PLAYER_SPAWN_POSITION_PADDING);
   return new Point(x, y);
}

const respawnPlayer = (playerClient: PlayerClient): void => {
   // Calculate spawn position
   let spawnPosition: Point;
   if (playerClient.tribe.totem !== null) {
      spawnPosition = playerClient.tribe.totem.position.copy();
      const offsetDirection = 2 * Math.PI * Math.random();
      spawnPosition.x += 100 * Math.sin(offsetDirection);
      spawnPosition.y += 100 * Math.cos(offsetDirection);
   } else {
      spawnPosition = generatePlayerSpawnPosition(playerClient.tribe.tribeType);
   }

   const player = createPlayer(spawnPosition, playerClient.tribe, playerClient.username);
   playerClient.instanceID = player.id;

   const dataPacket: RespawnDataPacket = {
      playerID: player.id,
      spawnPosition: spawnPosition.package()
   };

   playerClient.socket.emit("respawn_data_packet", dataPacket);
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

// @Cleanup: most of this logic and that in attemptSwing should be done in tribe-member.ts
const processPlayerAttackPacket = (playerClient: PlayerClient, attackPacket: AttackPacket): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
   const targets = calculateRadialAttackTargets(player, ATTACK_OFFSET, ATTACK_RADIUS);

   const didSwingWithRightHand = attemptSwing(player, targets, attackPacket.itemSlot, InventoryName.hotbar);
   if (didSwingWithRightHand) {
      return;
   }

   // If a barbarian, attack with offhand
   const tribeComponent = TribeComponentArray.getComponent(player.id);
   if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
      attemptSwing(player, targets, 1, InventoryName.offhand);
   }
}

const processPlayerCraftingPacket = (playerClient: PlayerClient, recipeIndex: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
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

const processItemPickupPacket = (playerClient: PlayerClient, entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
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

   // Remove the item from its previous inventory
   const amountConsumed = consumeItemFromSlot(targetInventory, itemSlot, amount);

   // Hold the item
   // Copy it as the consumeItemFromSlot function modifies the original item's count
   const heldItem = createItem(pickedUpItem.type, amountConsumed);
   heldItemInventory.addItem(heldItem, 1);
}

const processItemReleasePacket = (playerClient: PlayerClient, entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

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

const processItemUsePacket = (playerClient: PlayerClient, itemSlot: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.itemSlots[itemSlot];
   if (typeof item !== "undefined")  {
      useItem(player, item, InventoryName.hotbar, itemSlot);
   }
}

const processItemDropPacket = (playerClient: PlayerClient, inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   throwItem(player, inventoryName, itemSlot, dropAmount, throwDirection);
}

const processCommandPacket = (playerClient: PlayerClient, command: string): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
   registerCommand(command, player);
}

const processSelectTechPacket = (playerClient: PlayerClient, techID: TechID): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   playerClient.tribe.selectedTechID = techID;
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

const processTechUnlock = (playerClient: PlayerClient, techID: TechID): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

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

const processTechForceUnlock = (playerClient: PlayerClient, techID: TechID): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   playerClient.tribe.forceUnlockTech(techID);
}

const processStudyPacket = (playerClient: PlayerClient, studyAmount: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   const tribeComponent = TribeComponentArray.getComponent(player.id);
   
   if (tribeComponent.tribe.selectedTechID !== null) {
      const selectedTech = getTechByID(tribeComponent.tribe.selectedTechID);
      playerClient.tribe.studyTech(selectedTech, player.position.x, player.position.y, studyAmount);
   }
}

// @Cleanup: name, and there is already a shared definition
const snapRotationToPlayer = (player: Entity, placePosition: Point, rotation: number): number => {
   const playerDirection = player.position.calculateAngleBetween(placePosition);
   let snapRotation = playerDirection - rotation;

   // Snap to nearest PI/2 interval
   snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

   snapRotation += rotation;
   return snapRotation;
}

const processPlaceBlueprintPacket = (playerClient: PlayerClient, structureID: number, buildingType: BlueprintType): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
   const building = Board.entityRecord[structureID]!;

   // @Cleanup: should not do this logic here.
   const rotation = snapRotationToPlayer(player, building.position, building.rotation);
   placeBlueprint(player, structureID, buildingType, rotation);
}

const processModifyBuildingPacket = (playerClient: PlayerClient, structureID: number, data: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
   modifyBuilding(player, structureID, data);
}

const processDeconstructPacket = (playerClient: PlayerClient, structureID: number): void => {
   const building = Board.entityRecord[structureID];
   if (typeof building === "undefined") {
      return;
   }

   // Deconstruct
   building.destroy();

   if (BuildingMaterialComponentArray.hasComponent(structureID)) {
      const materialComponent = BuildingMaterialComponentArray.getComponent(building.id);
      
      if (building.type === EntityType.wall && materialComponent.material === BuildingMaterial.wood) {
         createItemsOverEntity(building, ItemType.wooden_wall, 1, 40);
         return;
      }
      
      const materialItemType = MATERIAL_TO_ITEM_MAP[materialComponent.material];
      createItemsOverEntity(building, materialItemType, 5, 40);
   }
}

const processStructureInteractPacket = (playerClient: PlayerClient, structureID: number, interactData: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
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

const processStructureUninteractPacket = (playerClient: PlayerClient, structureID: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
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

const processRecruitTribesmanPacket = (playerClient: PlayerClient, tribesmanID: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
   const tribesman = Board.entityRecord[tribesmanID];
   if (typeof tribesman === "undefined") {
      return;
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesmanID);
   const relation = tribesmanComponent.tribesmanRelations[player.id];
   if (typeof relation !== "undefined" && relation >= 50) {
      const tribeComponent = TribeComponentArray.getComponent(player.id);
      
      recruitTribesman(tribesman, tribeComponent.tribe);
   }
}
const processRespondToTitleOfferPacket = (playerClient: PlayerClient, title: TribesmanTitle, isAccepted: boolean): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }
   
   if (isAccepted) {
      acceptTitleOffer(player, title);
   } else {
      rejectTitleOffer(player, title);
   }
}

const devGiveItem = (playerClient: PlayerClient, itemType: ItemType, amount: number): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   addItemToInventory(inventory, itemType, amount);
}

const devSummonEntity = (playerClient: PlayerClient, summonPacket: EntitySummonPacket): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   const position = Point.unpackage(summonPacket.position);
   const rotation = summonPacket.rotation;

   switch (summonPacket.entityType) {
      case EntityType.ballista: {
         const tribeComponent = TribeComponentArray.getComponent(player.id);
         const connectionInfo = createEmptyStructureConnectionInfo();
         createBallista(position, rotation, tribeComponent.tribe, connectionInfo);
         break;
      }
      case EntityType.barrel: {};
      case EntityType.battleaxeProjectile: {};
      case EntityType.berryBush: {};
      case EntityType.blueprintEntity: {};
      case EntityType.boulder: {};
      case EntityType.cactus: {};
      case EntityType.campfire: {};
      case EntityType.cow: {};
      case EntityType.door: {};
      case EntityType.embrasure: {};
      case EntityType.fence: {};
      case EntityType.fenceGate: {};
      case EntityType.fish: {};
      case EntityType.floorPunjiSticks: {};
      case EntityType.floorSpikes: {};
      case EntityType.frostshaper: {};
      case EntityType.frozenYeti: {
         createFrozenYeti(position, 2 * Math.PI * Math.random());
         break;
      };
      case EntityType.furnace: {};
      case EntityType.golem: {};
      case EntityType.healingTotem: {};
      case EntityType.iceArrow: {};
      case EntityType.iceShardProjectile: {};
      case EntityType.iceSpikes: {};
      case EntityType.itemEntity: {};
      case EntityType.krumblid: {};
      case EntityType.pebblum: {};
      case EntityType.plant: {};
      case EntityType.planterBox: {};
      case EntityType.player: {};
      case EntityType.researchBench: {};
      case EntityType.rockSpikeProjectile: {};
      case EntityType.slime: {};
      case EntityType.slimeSpit: {};
      case EntityType.slimewisp: {};
      case EntityType.slingTurret: {};
      case EntityType.snowball: {};
      case EntityType.spearProjectile: {};
      case EntityType.spitPoison: {};
      case EntityType.stonecarvingTable: {};
      case EntityType.tombstone: {};
      case EntityType.tree: {};
      case EntityType.tribeTotem: {};
      case EntityType.tribeWarrior: {
         const tribeComponent = TribeComponentArray.getComponent(player.id);
         const inventoryComponentSummonData = summonPacket.summonData[ServerComponentType.inventory]!;

         const entityCreationInfo = createTribeWarrior(position, rotation, tribeComponent.tribe, 0);

         // @Temporary @Hack @Copynpaste
         const inventoryComponent = entityCreationInfo.components[ServerComponentType.inventory]!;
         const inventoryNames = Object.keys(inventoryComponentSummonData.itemSlots).map(Number) as Array<InventoryName>;
         for (let i = 0; i < inventoryNames.length; i++) {
            const inventoryName = inventoryNames[i];
            
            const itemSlots = inventoryComponentSummonData.itemSlots[inventoryName]!;
            for (const [itemSlotString, itemData] of Object.entries(itemSlots) as Array<[string, Item]>) {
               const itemSlot = Number(itemSlotString);
               
               const item = createItem(itemData.type, itemData.count);
               inventoryComponent.inventoryRecord[inventoryName]!.addItem(item, itemSlot);
            }
         }

         break;
      };
      case EntityType.tribeWorker: {
         const tribeComponentSummonData = summonPacket.summonData[ServerComponentType.tribe]!;
         const inventoryComponentSummonData = summonPacket.summonData[ServerComponentType.inventory]!;
         
         const entityCreationInfo = createTribeWorker(position, rotation, tribeComponentSummonData.tribeID, 0);

         // @Temporary @Hack @Copynpaste
         const inventoryComponent = entityCreationInfo.components[ServerComponentType.inventory]!;
         const inventoryNames = Object.keys(inventoryComponentSummonData.itemSlots).map(Number) as Array<InventoryName>;
         for (let i = 0; i < inventoryNames.length; i++) {
            const inventoryName = inventoryNames[i];
            
            const itemSlots = inventoryComponentSummonData.itemSlots[inventoryName]!;
            for (const [itemSlotString, itemData] of Object.entries(itemSlots) as Array<[string, Item]>) {
               const itemSlot = Number(itemSlotString);
               
               const item = createItem(itemData.type, itemData.count);
               inventoryComponent.inventoryRecord[inventoryName]!.addItem(item, itemSlot);
            }
         }
         
         break;
      };
      case EntityType.tunnel: {};
      case EntityType.wall: {};
      case EntityType.wallPunjiSticks: {};
      case EntityType.wallSpikes: {};
      case EntityType.warriorHut: {};
      case EntityType.woodenArrowProjectile: {};
      case EntityType.workbench: {};
      case EntityType.workerHut: {};
      case EntityType.yeti: {};
      case EntityType.zombie: {
         // @Temporary: isGolden
         createZombie(position, rotation, false, 0)
         break;
      };
      default: {
         const unreachable: never = summonPacket.entityType;
         return unreachable;
      }
   }
}

const devGiveTitle = (playerClient: PlayerClient, title: TribesmanTitle): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   forceAddTitle(player.id, title);
}

const devRemoveTitle = (playerClient: PlayerClient, title: TribesmanTitle): void => {
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player === "undefined") {
      return;
   }

   removeTitle(player.id, title);
}

export function addPlayerClient(playerClient: PlayerClient, player: Entity): void {
   playerClients.push(playerClient);

   const socket = playerClient.socket;

   const initialGameDataPacket = createInitialGameDataPacket(player);
   socket.emit("initial_game_data_packet", initialGameDataPacket);
   
   socket.on("disconnect", () => {
      handlePlayerDisconnect(playerClient);
   });

   socket.on("deactivate", () => {
      playerClient.clientIsActive = false;
   });

   socket.on("activate", () => {
      playerClient.clientIsActive = true;
      sendGameDataSyncPacket(playerClient);
   });

   socket.on("player_data_packet", (playerDataPacket: PlayerDataPacket) => {
      processPlayerDataPacket(playerClient, playerDataPacket);
   });

   socket.on("attack_packet", (attackPacket: AttackPacket) => {
      processPlayerAttackPacket(playerClient, attackPacket);
   });

   socket.on("crafting_packet", (recipeIndex: number) => {
      processPlayerCraftingPacket(playerClient, recipeIndex);
   });

   socket.on("item_pickup", (entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number) => {
      processItemPickupPacket(playerClient, entityID, inventoryName, itemSlot, amount);
   });

   socket.on("item_release", (entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number) => {
      processItemReleasePacket(playerClient, entityID, inventoryName, itemSlot, amount);
   });

   socket.on("item_use_packet", (itemSlot: number) => {
      processItemUsePacket(playerClient, itemSlot);
   });

   socket.on("held_item_drop", (dropAmount: number, throwDirection: number) => {
      processItemDropPacket(playerClient, InventoryName.heldItemSlot, 1, dropAmount, throwDirection);
   });

   socket.on("item_drop", (itemSlot: number, dropAmount: number, throwDirection: number) => {
      processItemDropPacket(playerClient, InventoryName.hotbar, itemSlot, dropAmount, throwDirection);
   });

   socket.on("respawn", () => {
      // @Cleanup: show the emit here
      respawnPlayer(playerClient);
   });
   
   socket.on("command", (command: string) => {
      processCommandPacket(playerClient, command);
   });

   socket.on("track_game_object", (id: number): void => {
      // @Cleanup: shouldn't be in the server!
      SERVER.setTrackedGameObject(id);
   });

   socket.on("select_tech", (techID: TechID): void => {
      processSelectTechPacket(playerClient, techID);
   });

   socket.on("unlock_tech", (techID: TechID): void => {
      processTechUnlock(playerClient, techID);
   });

   socket.on("force_unlock_tech", (techID: TechID): void => {
      processTechForceUnlock(playerClient, techID);
   });

   socket.on("study_tech", (studyAmount: number): void => {
      processStudyPacket(playerClient, studyAmount);
   });

   socket.on("place_blueprint", (structureID: number, buildingType: BlueprintType): void => {
      processPlaceBlueprintPacket(playerClient, structureID, buildingType);
   });

   socket.on("modify_building", (structureID: number, data: number): void => {
      processModifyBuildingPacket(playerClient, structureID, data);
   });

   socket.on("deconstruct_building", (structureID: number): void => {
      processDeconstructPacket(playerClient, structureID);
   });

   socket.on("structure_interact", (structureID: number, interactData: number): void => {
      processStructureInteractPacket(playerClient, structureID, interactData);
   });

   socket.on("structure_uninteract", (structureID: number): void => {
      processStructureUninteractPacket(playerClient, structureID);
   });

   socket.on("recruit_tribesman", (tribesmanID: number): void => {
      processRecruitTribesmanPacket(playerClient, tribesmanID);
   });

   socket.on("respond_to_title_offer", (title: TribesmanTitle, isAccepted: boolean): void => {
      processRespondToTitleOfferPacket(playerClient, title, isAccepted);
   });

   socket.on("dev_pause_simulation", (): void => {
      SERVER.isSimulating = false;
   });

   socket.on("dev_unpause_simulation", (): void => {
      SERVER.isSimulating = true;
   });

   // -------------------------- //
   //       DEV-ONLY EVENTS      //
   // -------------------------- //

   socket.on("dev_give_item", (itemType: ItemType, amount: number): void => {
      devGiveItem(playerClient, itemType, amount);
   });

   socket.on("dev_summon_entity", (summonPacket: EntitySummonPacket): void => {
      devSummonEntity(playerClient, summonPacket);
   });

   socket.on("dev_give_title", (title: TribesmanTitle): void => {
      devGiveTitle(playerClient, title);
   });

   socket.on("dev_remove_title", (title: TribesmanTitle): void => {
      devRemoveTitle(playerClient, title);
   });

   socket.on("dev_create_tribe", (): void => {
      new Tribe(TribeType.plainspeople, true);
   });

   socket.on("dev_change_tribe_type", (tribeID: number, newTribeType: TribeType): void => {
      const tribe = Board.getTribeExpected(tribeID);
      if (tribe !== null) {
         tribe.tribeType = newTribeType;
      }
   });
}




const shouldShowDamageNumber = (playerClient: PlayerClient, attackingEntity: Entity | null): boolean => {
   if (attackingEntity === null) {
      return false;
   }
   
   // Show damage from the player
   const player = Board.entityRecord[playerClient.instanceID];
   if (typeof player !== "undefined" && attackingEntity === player) {
      return true;
   }

   // Show damage from friendly turrets
   if (TurretComponentArray.hasComponent(attackingEntity.id)) {
      const tribeComponent = TribeComponentArray.getComponent(attackingEntity.id);
      if (tribeComponent.tribe === playerClient.tribe) {
         return true;
      }
   }

   return false;
}

const getPlayersViewingPosition = (minX: number, maxX: number, minY: number, maxY: number): ReadonlyArray<PlayerClient> => {
   const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   const viewingPlayerClients = new Array<PlayerClient>();

   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];
      if (!playerClient.clientIsActive) {
         continue;
      }

      if (minChunkX <= playerClient.visibleChunkBounds[1] && maxChunkX >= playerClient.visibleChunkBounds[0] && minChunkY <= playerClient.visibleChunkBounds[3] && maxChunkY >= playerClient.visibleChunkBounds[2]) {
         viewingPlayerClients.push(playerClient);
      }
   }

   return viewingPlayerClients;
}

export function registerEntityHit(hitEntityID: number, attackingEntity: Entity | null, hitPosition: Point, attackEffectiveness: AttackEffectiveness, damage: number, flags: number): void {
   // @Temporary
   const hitEntity = Board.entityRecord[hitEntityID]!;
   
   const viewingPlayers = getPlayersViewingPosition(hitEntity.boundingAreaMinX, hitEntity.boundingAreaMaxX, hitEntity.boundingAreaMinY, hitEntity.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }
   
   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];

      const hitData: HitData = {
         hitEntityID: hitEntityID,
         hitPosition: hitPosition.package(),
         attackEffectiveness: attackEffectiveness,
         damage: damage,
         shouldShowDamageNumber: shouldShowDamageNumber(playerClient, attackingEntity),
         flags: flags
      };
      playerClient.visibleHits.push(hitData);
   }
}

export function registerPlayerKnockback(playerID: number, knockback: number, knockbackDirection: number): void {
   const knockbackData: PlayerKnockbackData = {
      knockback: knockback,
      knockbackDirection: knockbackDirection
   };

   const playerClient = getPlayerClientFromInstanceID(playerID);
   if (playerClient !== null) {
      playerClient.playerKnockbacks.push(knockbackData);
   }
}

export function registerEntityHeal(healedEntity: Entity, healerID: number, healAmount: number): void {
   const viewingPlayers = getPlayersViewingPosition(healedEntity.boundingAreaMinX, healedEntity.boundingAreaMaxX, healedEntity.boundingAreaMinY, healedEntity.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }

   const healData: HealData = {
      entityPositionX: healedEntity.position.x,
      entityPositionY: healedEntity.position.y,
      healedID: healedEntity.id,
      healerID: healerID,
      healAmount: healAmount
   };
   
   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.heals.push(healData);
   }
}

export function registerEntityDeath(entity: Entity): void {
   const viewingPlayers = getPlayersViewingPosition(entity.boundingAreaMinX, entity.boundingAreaMaxX, entity.boundingAreaMinY, entity.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.visibleEntityDeathIDs.push(entity.id);
   }
}

export function registerResearchOrbComplete(orbCompleteData: ResearchOrbCompleteData): void {
   const viewingPlayers = getPlayersViewingPosition(orbCompleteData.x, orbCompleteData.x, orbCompleteData.y, orbCompleteData.y);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.orbCompletes.push(orbCompleteData);
   }
}

export function registerEntityTickEvent(entity: Entity, tickEvent: EntityTickEvent): void {
   const viewingPlayers = getPlayersViewingPosition(entity.boundingAreaMinX, entity.boundingAreaMaxX, entity.boundingAreaMinY, entity.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.entityTickEvents.push(tickEvent);
   }
}

export function registerPlayerDroppedItemPickup(player: Entity): void {
   const playerClient = getPlayerClientFromInstanceID(player.id);
   if (playerClient !== null) {
      playerClient.pickedUpItem = true;
   } else {
      console.warn("Couldn't find player to pickup item!");
   }
}

export function forcePlayerTeleport(player: Entity, position: Point): void {
   const playerClient = getPlayerClientFromInstanceID(player.id);
   if (playerClient !== null) {
      playerClient.socket.emit("force_position_update", position.package());
   }
}