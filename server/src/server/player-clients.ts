import { PlayerDataPacket, AttackPacket, RespawnDataPacket, HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData } from "webgl-test-shared/dist/client-server-types";
import { BlueprintType, BuildingMaterial, MATERIAL_TO_ITEM_MAP, ServerComponentType } from "webgl-test-shared/dist/components";
import { TechID, TechInfo, getTechByID } from "webgl-test-shared/dist/techs";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import Board from "../Board";
import { registerCommand } from "../commands";
import { acceptTitleOffer, forceAddTitle, rejectTitleOffer, removeTitle } from "../components/TribeMemberComponent";
import { createPlayerConfig, modifyBuilding, startChargingBattleaxe, startChargingBow, startChargingSpear, startEating } from "../entities/tribes/player";
import { throwItem, placeBlueprint, attemptAttack, calculateAttackTarget, calculateBlueprintWorkTarget, calculateRadialAttackTargets, calculateRepairTarget, repairBuilding, getAvailableCraftingStations, useItem } from "../entities/tribes/tribe-member";
import PlayerClient from "./PlayerClient";
import { SERVER } from "./server";
import { createSyncDataPacket, createInitialGameDataPacket } from "./game-data-packets";
import { EntityID, EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { TRIBE_INFO_RECORD, TribeType } from "webgl-test-shared/dist/tribes";
import { InventoryUseComponentArray } from "../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { InventoryComponentArray, addItemToInventory, addItemToSlot, consumeItemFromSlot, consumeItemTypeFromInventory, craftRecipe, getInventory, getInventoryFromCreationInfo, inventoryComponentCanAffordRecipe, recipeCraftingStationIsAvailable } from "../components/InventoryComponent";
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
import { CRAFTING_RECIPES, ItemRequirements } from "webgl-test-shared/dist/items/crafting-recipes";
import { InventoryName, Item, ITEM_TYPE_RECORD, ItemType } from "webgl-test-shared/dist/items/items";
import Tribe from "../Tribe";
import { EntityTickEvent } from "webgl-test-shared/dist/entity-events";
import { TransformComponentArray } from "../components/TransformComponent";
import { createEntityFromConfig } from "../Entity";
import { createEntityConfig } from "../entity-creation";
import { ComponentConfig } from "../components";

// @Cleanup: see if a decorator can be used to cut down on the player entity check copy-n-paste

/** Minimum number of units away from the border that the player will spawn at */
const PLAYER_SPAWN_POSITION_PADDING = 300;

const playerClients = new Array<PlayerClient>();

const dirtyEntities = new Set<EntityID>();

export function getPlayerClients(): ReadonlyArray<PlayerClient> {
   return playerClients;
}

const getPlayerClientFromInstanceID = (instanceID: number): PlayerClient | null => {
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];

      if (playerClient.instance === instanceID) {
         return playerClient;
      }
   }

   return null;
}

// @Cleanup: better to be done by the player component array
export function getPlayerFromUsername(username: string): EntityID | null {
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];

      if (playerClient.username === username && Board.hasEntity(playerClient.instance)) {
         return playerClient.instance;
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
   if (Board.hasEntity(playerClient.instance)) {
      Board.destroyEntity(playerClient.instance);
   }
}

const processPlayerDataPacket = (playerClient: PlayerClient, playerDataPacket: PlayerDataPacket): void => {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerClient.instance);
   const hotbarUseInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);

   const transformComponent = TransformComponentArray.getComponent(playerClient.instance);
   transformComponent.position.x = playerDataPacket.position[0];
   transformComponent.position.y = playerDataPacket.position[1];
   transformComponent.rotation = playerDataPacket.rotation;

   playerClient.visibleChunkBounds = playerDataPacket.visibleChunkBounds;
   playerClient.gameDataOptions = playerDataPacket.gameDataOptions;
   
   const physicsComponent = PhysicsComponentArray.getComponent(playerClient.instance);
   physicsComponent.hitboxesAreDirty = true;
   
   physicsComponent.velocity.x = playerDataPacket.velocity[0];
   physicsComponent.velocity.y = playerDataPacket.velocity[1];
   physicsComponent.acceleration.x = playerDataPacket.acceleration[0];
   physicsComponent.acceleration.y = playerDataPacket.acceleration[1];
   
   hotbarUseInfo.selectedItemSlot = playerDataPacket.selectedItemSlot;

   const playerComponent = PlayerComponentArray.getComponent(playerClient.instance);
   playerComponent.interactingEntityID = playerDataPacket.interactingEntityID !== null ? playerDataPacket.interactingEntityID : 0;

   // @Bug: won't work for using medicine in offhand
   let overrideOffhand = false;
   
   if ((playerDataPacket.mainAction === LimbAction.eat || playerDataPacket.mainAction === LimbAction.useMedicine) && (hotbarUseInfo.action !== LimbAction.eat && hotbarUseInfo.action !== LimbAction.useMedicine)) {
      overrideOffhand = startEating(playerClient.instance, InventoryName.hotbar);
   } else if (playerDataPacket.mainAction === LimbAction.chargeBow && hotbarUseInfo.action !== LimbAction.chargeBow) {
      startChargingBow(playerClient.instance, InventoryName.hotbar);
   } else if (playerDataPacket.mainAction === LimbAction.chargeSpear && hotbarUseInfo.action !== LimbAction.chargeSpear) {
      startChargingSpear(playerClient.instance, InventoryName.hotbar);
   } else if (playerDataPacket.mainAction === LimbAction.chargeBattleaxe && hotbarUseInfo.action !== LimbAction.chargeBattleaxe) {
      startChargingBattleaxe(playerClient.instance, InventoryName.hotbar);
   } else {
      hotbarUseInfo.action = playerDataPacket.mainAction;
   }

   if (!overrideOffhand) {
      const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
      if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
         const offhandUseInfo = inventoryUseComponent.getUseInfo(InventoryName.offhand);

         if ((playerDataPacket.offhandAction === LimbAction.eat || playerDataPacket.offhandAction === LimbAction.useMedicine) && (offhandUseInfo.action !== LimbAction.eat && offhandUseInfo.action !== LimbAction.useMedicine)) {
            startEating(playerClient.instance, InventoryName.offhand);
         } else if (playerDataPacket.offhandAction === LimbAction.chargeBow && offhandUseInfo.action !== LimbAction.chargeBow) {
            startChargingBow(playerClient.instance, InventoryName.offhand);
         } else if (playerDataPacket.offhandAction === LimbAction.chargeSpear && offhandUseInfo.action !== LimbAction.chargeSpear) {
            startChargingSpear(playerClient.instance, InventoryName.offhand);
         } else if (playerDataPacket.offhandAction === LimbAction.chargeBattleaxe && offhandUseInfo.action !== LimbAction.chargeBattleaxe) {
            startChargingBattleaxe(playerClient.instance, InventoryName.offhand);
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
      const totemTransformComponent = TransformComponentArray.getComponent(playerClient.tribe.totem);
      spawnPosition = totemTransformComponent.position.copy();
      const offsetDirection = 2 * Math.PI * Math.random();
      spawnPosition.x += 100 * Math.sin(offsetDirection);
      spawnPosition.y += 100 * Math.cos(offsetDirection);
   } else {
      spawnPosition = generatePlayerSpawnPosition(playerClient.tribe.tribeType);
   }

   const config = createPlayerConfig();
   config[ServerComponentType.transform].position.x = spawnPosition.x;
   config[ServerComponentType.transform].position.y = spawnPosition.y;
   config[ServerComponentType.tribe].tribe = playerClient.tribe;
   config[ServerComponentType.player].username = playerClient.username;
   const player = createEntityFromConfig(config);

   playerClient.instance = player;

   const dataPacket: RespawnDataPacket = {
      playerID: player,
      spawnPosition: spawnPosition.package()
   };

   playerClient.socket.emit("respawn_data_packet", dataPacket);
}

const processPlayerCraftingPacket = (playerClient: PlayerClient, recipeIndex: number): void => {
   const player = playerClient.instance;
   if (!Board.hasEntity(player)) {
      return;
   }
   
   if (recipeIndex < 0 || recipeIndex >= CRAFTING_RECIPES.length) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const craftingRecipe = CRAFTING_RECIPES[recipeIndex];

   const availableCraftingStations = getAvailableCraftingStations(player);
   if (!recipeCraftingStationIsAvailable(availableCraftingStations, craftingRecipe)) {
      return;
   }

   if (inventoryComponentCanAffordRecipe(inventoryComponent, craftingRecipe, InventoryName.craftingOutputSlot)) {
      craftRecipe(inventoryComponent, craftingRecipe, InventoryName.craftingOutputSlot);
   }
}

const processItemPickupPacket = (playerClient: PlayerClient, entity: EntityID, inventoryName: InventoryName, itemSlot: number, amount: number): void => {
   const player = playerClient.instance;
   if (!Board.hasEntity(player) || !Board.hasEntity(entity)) {
      return;
   }
   
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
   const amountConsumed = consumeItemFromSlot(targetInventory, itemSlot, amount);

   // Hold the item
   // Copy it as the consumeItemFromSlot function modifies the original item's count
   const heldItem = createItem(pickedUpItem.type, amountConsumed);
   heldItemInventory.addItem(heldItem, 1);
}

const processItemReleasePacket = (playerClient: PlayerClient, entity: EntityID, inventoryName: InventoryName, itemSlot: number, amount: number): void => {
   if (!Board.hasEntity(playerClient.instance) || !Board.hasEntity(entity)) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);
   
   // Don't release an item if there is no held item
   const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const heldItem = heldItemInventory.itemSlots[1];
   if (typeof heldItem === "undefined") {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entity);

   // Add the item to the inventory
   const amountAdded = addItemToSlot(targetInventoryComponent, inventoryName, itemSlot, heldItem.type, amount);

   // If all of the item was added, clear the held item
   consumeItemTypeFromInventory(inventoryComponent, InventoryName.heldItemSlot, heldItem.type, amountAdded);
}

const processItemUsePacket = (playerClient: PlayerClient, itemSlot: number): void => {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.itemSlots[itemSlot];
   if (typeof item !== "undefined")  {
      useItem(playerClient.instance, item, InventoryName.hotbar, itemSlot);
   }
}

const processItemDropPacket = (playerClient: PlayerClient, inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void => {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   throwItem(playerClient.instance, inventoryName, itemSlot, dropAmount, throwDirection);
}

const processCommandPacket = (playerClient: PlayerClient, command: string): void => {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }
   
   registerCommand(command, playerClient.instance);
}

const processSelectTechPacket = (playerClient: PlayerClient, techID: TechID): void => {
   if (!Board.hasEntity(playerClient.instance)) {
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
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   const tech = getTechByID(techID);
   
   const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);

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
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   playerClient.tribe.forceUnlockTech(techID);
}

const processStudyPacket = (playerClient: PlayerClient, studyAmount: number): void => {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
   
   if (tribeComponent.tribe.selectedTechID !== null) {
      const transformComponent = TransformComponentArray.getComponent(playerClient.instance);
      const selectedTech = getTechByID(tribeComponent.tribe.selectedTechID);
      playerClient.tribe.studyTech(selectedTech, transformComponent.position.x, transformComponent.position.y, studyAmount);
   }
}

// @Cleanup: name, and there is already a shared definition
const snapRotationToPlayer = (player: EntityID, placePosition: Point, rotation: number): number => {
   const transformComponent = TransformComponentArray.getComponent(player);
   const playerDirection = transformComponent.position.calculateAngleBetween(placePosition);
   let snapRotation = playerDirection - rotation;

   // Snap to nearest PI/2 interval
   snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

   snapRotation += rotation;
   return snapRotation;
}

const processPlaceBlueprintPacket = (playerClient: PlayerClient, structure: EntityID, buildingType: BlueprintType): void => {
   if (!Board.hasEntity(playerClient.instance) || !Board.hasEntity(structure)) {
      return;
   }

   // @Cleanup: should not do this logic here.
   const structureTransformComponent = TransformComponentArray.getComponent(structure);
   const rotation = snapRotationToPlayer(playerClient.instance, structureTransformComponent.position, structureTransformComponent.rotation);
   placeBlueprint(playerClient.instance, structure, buildingType, rotation);
}

const processModifyBuildingPacket = (playerClient: PlayerClient, structure: EntityID, data: number): void => {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }
   
   modifyBuilding(playerClient.instance, structure, data);
}

const processDeconstructPacket = (playerClient: PlayerClient, structure: EntityID): void => {
   if (!Board.hasEntity(structure)) {
      return;
   }

   // Deconstruct
   Board.destroyEntity(structure);

   if (BuildingMaterialComponentArray.hasComponent(structure)) {
      const materialComponent = BuildingMaterialComponentArray.getComponent(structure);
      
      if (Board.getEntityType(structure) === EntityType.wall && materialComponent.material === BuildingMaterial.wood) {
         createItemsOverEntity(structure, ItemType.wooden_wall, 1, 40);
         return;
      }
      
      const materialItemType = MATERIAL_TO_ITEM_MAP[materialComponent.material];
      createItemsOverEntity(structure, materialItemType, 5, 40);
   }
}

const processStructureInteractPacket = (playerClient: PlayerClient, structure: EntityID, interactData: number): void => {
   if (!Board.hasEntity(playerClient.instance) || !Board.hasEntity(structure)) {
      return;
   }

   switch (Board.getEntityType(structure)) {
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

const processStructureUninteractPacket = (playerClient: PlayerClient, structure: EntityID): void => {
   if (!Board.hasEntity(playerClient.instance) || !Board.hasEntity(playerClient.instance)) {
      return;
   }

   switch (Board.getEntityType(structure)) {
      case EntityType.researchBench: {
         deoccupyResearchBench(structure, playerClient.instance);
         break;
      }
   }
}

const processRecruitTribesmanPacket = (playerClient: PlayerClient, tribesman: EntityID): void => {
   if (!Board.hasEntity(playerClient.instance) || !Board.hasEntity(tribesman)) {
      return;
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   const relation = tribesmanComponent.tribesmanRelations[playerClient.instance];
   if (typeof relation !== "undefined" && relation >= 50) {
      const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
      
      recruitTribesman(tribesman, tribeComponent.tribe);
   }
}
const processRespondToTitleOfferPacket = (playerClient: PlayerClient, title: TribesmanTitle, isAccepted: boolean): void => {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }
   
   if (isAccepted) {
      acceptTitleOffer(playerClient.instance, title);
   } else {
      rejectTitleOffer(playerClient.instance, title);
   }
}

const devGiveItem = (playerClient: PlayerClient, itemType: ItemType, amount: number): void => {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   addItemToInventory(inventory, itemType, amount);
}

const devSummonEntity = (playerClient: PlayerClient, summonPacket: EntitySummonPacket): void => {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   const config = createEntityConfig(summonPacket.entityType);
   config[ServerComponentType.transform].position.x = summonPacket.position[0];
   config[ServerComponentType.transform].position.y = summonPacket.position[1];
   config[ServerComponentType.transform].rotation = summonPacket.rotation;

   const inventoryComponentSummonData = summonPacket.summonData[ServerComponentType.inventory];
   if (typeof inventoryComponentSummonData !== "undefined") {
      config[ServerComponentType.inventory].inventories
      
      const inventoryNames = Object.keys(inventoryComponentSummonData.itemSlots).map(Number) as Array<InventoryName>;
      for (let i = 0; i < inventoryNames.length; i++) {
         const inventoryName = inventoryNames[i];

         const creationInfo = getInventoryFromCreationInfo(config[ServerComponentType.inventory].inventories, inventoryName);
         
         const itemSlots = inventoryComponentSummonData.itemSlots[inventoryName]!;
         for (const [itemSlotString, itemData] of Object.entries(itemSlots) as Array<[string, Item]>) {
            const itemSlot = Number(itemSlotString);
            
            const item = createItem(itemData.type, itemData.count);
            creationInfo.items.push({
               itemSlot: itemSlot,
               item: item
            });
         }
      }
   }

   const tribeComponentSummonData = summonPacket.summonData[ServerComponentType.tribe];
   if (typeof tribeComponentSummonData !== "undefined") {
      config[ServerComponentType.tribe].tribe = Board.getTribeExpected(tribeComponentSummonData.tribeID);
   }

   createEntityFromConfig(config);
}

const devGiveTitle = (playerClient: PlayerClient, title: TribesmanTitle): void => {
   const player = playerClient.instance;
   if (!Board.hasEntity(player)) {
      return;
   }

   forceAddTitle(player, title);
}

const devRemoveTitle = (playerClient: PlayerClient, title: TribesmanTitle): void => {
   const player = playerClient.instance;
   if (!Board.hasEntity(player)) {
      return;
   }

   removeTitle(player, title);
}

export function addPlayerClient(playerClient: PlayerClient, player: EntityID, playerConfig: ComponentConfig<ServerComponentType.transform>): void {
   playerClients.push(playerClient);

   const socket = playerClient.socket;

   const initialGameDataPacket = createInitialGameDataPacket(player, playerConfig);
   socket.send(initialGameDataPacket);
   
   socket.on("disconnect", () => {
      handlePlayerDisconnect(playerClient);
   });

   socket.on("deactivate", () => {
      playerClient.clientIsActive = false;
   });

   socket.on("player_data_packet", (playerDataPacket: PlayerDataPacket) => {
      processPlayerDataPacket(playerClient, playerDataPacket);
   });

   socket.on("crafting_packet", (recipeIndex: number) => {
      processPlayerCraftingPacket(playerClient, recipeIndex);
   });

   socket.on("item_pickup", (entity: EntityID, inventoryName: InventoryName, itemSlot: number, amount: number) => {
      processItemPickupPacket(playerClient, entity, inventoryName, itemSlot, amount);
   });

   socket.on("item_release", (entity: EntityID, inventoryName: InventoryName, itemSlot: number, amount: number) => {
      processItemReleasePacket(playerClient, entity, inventoryName, itemSlot, amount);
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




const shouldShowDamageNumber = (playerClient: PlayerClient, attackingEntity: EntityID | null): boolean => {
   if (attackingEntity === null) {
      return false;
   }
   
   // Show damage from the player
   if (attackingEntity === playerClient.instance) {
      return true;
   }

   // Show damage from friendly turrets
   if (TurretComponentArray.hasComponent(attackingEntity)) {
      const tribeComponent = TribeComponentArray.getComponent(attackingEntity);
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

export function registerEntityHit(hitEntity: EntityID, attackingEntity: EntityID | null, hitPosition: Point, attackEffectiveness: AttackEffectiveness, damage: number, flags: number): void {
   const hitEntityTransformComponent = TransformComponentArray.getComponent(hitEntity);
   const viewingPlayers = getPlayersViewingPosition(hitEntityTransformComponent.boundingAreaMinX, hitEntityTransformComponent.boundingAreaMaxX, hitEntityTransformComponent.boundingAreaMinY, hitEntityTransformComponent.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }
   
   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];

      const hitData: HitData = {
         hitEntityID: hitEntity,
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

export function registerEntityHeal(healedEntity: EntityID, healer: EntityID, healAmount: number): void {
   const transformComponent = TransformComponentArray.getComponent(healedEntity);
   const viewingPlayers = getPlayersViewingPosition(transformComponent.boundingAreaMinX, transformComponent.boundingAreaMaxX, transformComponent.boundingAreaMinY, transformComponent.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }

   const healData: HealData = {
      entityPositionX: transformComponent.position.x,
      entityPositionY: transformComponent.position.y,
      healedID: healedEntity,
      healerID: healer,
      healAmount: healAmount
   };
   
   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.heals.push(healData);
   }
}

export function registerEntityDeath(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const viewingPlayers = getPlayersViewingPosition(transformComponent.boundingAreaMinX, transformComponent.boundingAreaMaxX, transformComponent.boundingAreaMinY, transformComponent.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.visibleEntityDeathIDs.push(entity);
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

export function registerEntityTickEvent(entity: EntityID, tickEvent: EntityTickEvent): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const viewingPlayers = getPlayersViewingPosition(transformComponent.boundingAreaMinX, transformComponent.boundingAreaMaxX, transformComponent.boundingAreaMinY, transformComponent.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.entityTickEvents.push(tickEvent);
   }
}

export function registerPlayerDroppedItemPickup(player: EntityID): void {
   const playerClient = getPlayerClientFromInstanceID(player);
   if (playerClient !== null) {
      playerClient.hasPickedUpItem = true;
   } else {
      console.warn("Couldn't find player to pickup item!");
   }
}

export function forcePlayerTeleport(player: EntityID, position: Point): void {
   const playerClient = getPlayerClientFromInstanceID(player);
   if (playerClient !== null) {
      playerClient.socket.emit("force_position_update", position.package());
   }
}

export function registerDirtyEntity(entity: EntityID): void {
   if (dirtyEntities.has(entity)) {
      return;
   }
   dirtyEntities.add(entity);
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const viewingPlayers = getPlayersViewingPosition(transformComponent.boundingAreaMinX, transformComponent.boundingAreaMaxX, transformComponent.boundingAreaMinY, transformComponent.boundingAreaMaxY);

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.visibleDirtiedEntities.push(entity);
   }
}

export function resetDirtyEntities(): void {
   dirtyEntities.clear();
}