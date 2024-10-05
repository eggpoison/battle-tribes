import { HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData } from "battletribes-shared/client-server-types";
import { BlueprintType, BuildingMaterial, MATERIAL_TO_ITEM_MAP, ServerComponentType } from "battletribes-shared/components";
import { TechID, TechInfo, getTechByID } from "battletribes-shared/techs";
import { TribesmanTitle } from "battletribes-shared/titles";
import Layer, { getTileX, getTileY } from "../Layer";
import { registerCommand } from "../commands";
import { acceptTitleOffer, forceAddTitle, rejectTitleOffer, removeTitle } from "../components/TribeMemberComponent";
import { modifyBuilding } from "../entities/tribes/player";
import { placeBlueprint, getAvailableCraftingStations } from "../entities/tribes/tribe-member";
import PlayerClient from "./PlayerClient";
import { SERVER } from "./server";
import { createInitialGameDataPacket } from "./game-data-packets";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { TRIBE_INFO_RECORD, TribeType } from "battletribes-shared/tribes";
import { InventoryComponentArray, addItemToInventory, craftRecipe, getInventory, inventoryComponentCanAffordRecipe, recipeCraftingStationIsAvailable } from "../components/InventoryComponent";
import { TribeComponentArray, recruitTribesman } from "../components/TribeComponent";
import { createItem } from "../items";
import { Point, randInt, randItem } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { getTilesOfBiome } from "../census";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { attemptToOccupyResearchBench, deoccupyResearchBench } from "../components/ResearchBenchComponent";
import { toggleDoor } from "../components/DoorComponent";
import { toggleFenceGateDoor } from "../components/FenceGateComponent";
import { toggleTunnelDoor } from "../components/TunnelComponent";
import { createItemsOverEntity } from "../entity-shared";
import { BuildingMaterialComponentArray } from "../components/BuildingMaterialComponent";
import { TurretComponentArray } from "../components/TurretComponent";
import { TribesmanAIComponentArray } from "../components/TribesmanAIComponent";
import { EntitySummonPacket } from "battletribes-shared/dev-packets";
import { CRAFTING_RECIPES, ItemRequirements } from "battletribes-shared/items/crafting-recipes";
import { Inventory, InventoryName, Item, ItemType } from "battletribes-shared/items/items";
import Tribe from "../Tribe";
import { EntityTickEvent } from "battletribes-shared/entity-events";
import { TransformComponentArray } from "../components/TransformComponent";
import { createEntityFromConfig } from "../Entity";
import { EntityConfig } from "../components";
import { destroyEntity, entityExists, getEntityLayer, getEntityType, getTribe } from "../world";

// @Cleanup: see if a decorator can be used to cut down on the player entity check copy-n-paste

/** Minimum number of units away from the border that the player will spawn at */
const PLAYER_SPAWN_POSITION_PADDING = 300;

const playerClients = new Array<PlayerClient>();

const dirtyEntities = new Set<EntityID>();

export function getPlayerClients(): ReadonlyArray<PlayerClient> {
   return playerClients;
}

export function getPlayerClientFromInstanceID(instanceID: number): PlayerClient | null {
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

      if (playerClient.username === username && entityExists(playerClient.instance)) {
         return playerClient.instance;
      }
   }

   return null;
}

export function handlePlayerDisconnect(playerClient: PlayerClient): void {
   // Remove player client
   const idx = playerClients.indexOf(playerClient);
   if (idx !== -1) {
      playerClients.splice(idx, 1);
   } else {
      console.warn("Could not find the player client.");
   }

   // Kill the player
   if (entityExists(playerClient.instance)) {
      destroyEntity(playerClient.instance);
   }
}

export function generatePlayerSpawnPosition(tribeType: TribeType): Point {
   // @Temporary
   return new Point(Settings.BOARD_UNITS * 0.5, Settings.BOARD_UNITS * 0.5);
   
   const tribeInfo = TRIBE_INFO_RECORD[tribeType];
   for (let numAttempts = 0; numAttempts < 50; numAttempts++) {
      const biomeName = randItem(tribeInfo.biomes);
      const biomeTiles = getTilesOfBiome(biomeName);
      if (biomeTiles.length === 0) {
         continue;
      }

      const tileIndex = randItem(biomeTiles);

      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;

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

const processPlayerCraftingPacket = (playerClient: PlayerClient, recipeIndex: number): void => {
   const player = playerClient.instance;
   if (!entityExists(player)) {
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

const processCommandPacket = (playerClient: PlayerClient, command: string): void => {
   if (!entityExists(playerClient.instance)) {
      return;
   }
   
   registerCommand(command, playerClient.instance);
}

const processSelectTechPacket = (playerClient: PlayerClient, techID: TechID): void => {
   if (!entityExists(playerClient.instance)) {
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
   if (!entityExists(playerClient.instance)) {
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
   if (!entityExists(playerClient.instance)) {
      return;
   }

   playerClient.tribe.forceUnlockTech(techID);
}

const processStudyPacket = (playerClient: PlayerClient, studyAmount: number): void => {
   if (!entityExists(playerClient.instance)) {
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
   if (!entityExists(playerClient.instance) || !entityExists(structure)) {
      return;
   }

   // @Cleanup: should not do this logic here.
   const structureTransformComponent = TransformComponentArray.getComponent(structure);
   const rotation = snapRotationToPlayer(playerClient.instance, structureTransformComponent.position, structureTransformComponent.rotation);
   placeBlueprint(playerClient.instance, structure, buildingType, rotation);
}

const processModifyBuildingPacket = (playerClient: PlayerClient, structure: EntityID, data: number): void => {
   if (!entityExists(playerClient.instance)) {
      return;
   }
   
   modifyBuilding(playerClient.instance, structure, data);
}

const processDeconstructPacket = (playerClient: PlayerClient, structure: EntityID): void => {
   if (!entityExists(structure)) {
      return;
   }

   // Deconstruct
   destroyEntity(structure);

   if (BuildingMaterialComponentArray.hasComponent(structure)) {
      const materialComponent = BuildingMaterialComponentArray.getComponent(structure);
      
      if (getEntityType(structure) === EntityType.wall && materialComponent.material === BuildingMaterial.wood) {
         createItemsOverEntity(structure, ItemType.wooden_wall, 1, 40);
         return;
      }
      
      const materialItemType = MATERIAL_TO_ITEM_MAP[materialComponent.material];
      createItemsOverEntity(structure, materialItemType, 5, 40);
   }
}

const processStructureInteractPacket = (playerClient: PlayerClient, structure: EntityID, interactData: number): void => {
   if (!entityExists(playerClient.instance) || !entityExists(structure)) {
      return;
   }

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

const processStructureUninteractPacket = (playerClient: PlayerClient, structure: EntityID): void => {
   if (!entityExists(playerClient.instance) || !entityExists(playerClient.instance)) {
      return;
   }

   switch (getEntityType(structure)) {
      case EntityType.researchBench: {
         deoccupyResearchBench(structure, playerClient.instance);
         break;
      }
   }
}

const processRecruitTribesmanPacket = (playerClient: PlayerClient, tribesman: EntityID): void => {
   if (!entityExists(playerClient.instance) || !entityExists(tribesman)) {
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
   if (!entityExists(playerClient.instance)) {
      return;
   }
   
   if (isAccepted) {
      acceptTitleOffer(playerClient.instance, title);
   } else {
      rejectTitleOffer(playerClient.instance, title);
   }
}

const devGiveItem = (playerClient: PlayerClient, itemType: ItemType, amount: number): void => {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   addItemToInventory(inventory, itemType, amount);
}

const devSummonEntity = (playerClient: PlayerClient, summonPacket: EntitySummonPacket): void => {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   // @Incomplete

   // const config = createEntityConfig(summonPacket.entityType);
   // config.components[ServerComponentType.transform].position.x = summonPacket.position[0];
   // config.components[ServerComponentType.transform].position.y = summonPacket.position[1];
   // config.components[ServerComponentType.transform].rotation = summonPacket.rotation;

   // const inventoryComponentSummonData = summonPacket.summonData[ServerComponentType.inventory];
   // if (typeof inventoryComponentSummonData !== "undefined") {
   //    config.components[ServerComponentType.inventory].inventories
      
   //    const inventoryNames = Object.keys(inventoryComponentSummonData.itemSlots).map(Number) as Array<InventoryName>;
   //    for (let i = 0; i < inventoryNames.length; i++) {
   //       const inventoryName = inventoryNames[i];

   //       let inventory!: Inventory;
   //       const inventories = config.components[ServerComponentType.inventory].inventories;
   //       for (let i = 0; i < inventories.length; i++) {
   //          const currentInventory = inventories[i];
   //          if (currentInventory.name === inventoryName) {
   //             inventory =  currentInventory;
   //          }
   //       }
         
   //       const itemSlots = inventoryComponentSummonData.itemSlots[inventoryName]!;
   //       for (const [itemSlotString, itemData] of Object.entries(itemSlots) as Array<[string, Item]>) {
   //          const itemSlot = Number(itemSlotString);
            
   //          const item = createItem(itemData.type, itemData.count);
   //          inventory.addItem(item, itemSlot);
   //       }
   //    }
   // }

   // const tribeComponentSummonData = summonPacket.summonData[ServerComponentType.tribe];
   // if (typeof tribeComponentSummonData !== "undefined") {
   //    config.components[ServerComponentType.tribe].tribe = getTribe(tribeComponentSummonData.tribeID);
   // }

   // createEntityFromConfig(config, getEntityLayer(playerClient.instance), 0);
}

const devGiveTitle = (playerClient: PlayerClient, title: TribesmanTitle): void => {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   forceAddTitle(player, title);
}

const devRemoveTitle = (playerClient: PlayerClient, title: TribesmanTitle): void => {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   removeTitle(player, title);
}

export function addPlayerClient(playerClient: PlayerClient, player: EntityID, layer: Layer, playerConfig: EntityConfig<ServerComponentType.transform>): void {
   playerClients.push(playerClient);

   const socket = playerClient.socket;

   const initialGameDataPacket = createInitialGameDataPacket(player, layer, playerConfig);
   socket.send(initialGameDataPacket);

   socket.on("deactivate", () => {
      playerClient.clientIsActive = false;
   });

   socket.on("crafting_packet", (recipeIndex: number) => {
      processPlayerCraftingPacket(playerClient, recipeIndex);
   });

   // @Incomplete
   // socket.on("held_item_drop", (dropAmount: number, throwDirection: number) => {
   //    processItemDropPacket(playerClient, InventoryName.heldItemSlot, 1, dropAmount, throwDirection);
   // });

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
      const tribe = getTribe(tribeID);
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

export function registerEntityRemoval(entity: EntityID): void {
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