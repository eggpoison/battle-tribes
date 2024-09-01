import { addKeyListener, clearPressedKeys, keyIsPressed } from "./keyboard-input";
import { CraftingMenu_setCraftingStation, CraftingMenu_setIsVisible } from "./components/game/menus/CraftingMenu";
import Player from "./entities/Player";
import Client from "./client/Client";
import { Hotbar_setHotbarSelectedItemSlot, Hotbar_updateLeftThrownBattleaxeItemID, Hotbar_updateRightThrownBattleaxeItemID } from "./components/game/inventories/Hotbar";
import { BackpackInventoryMenu_setIsVisible } from "./components/game/inventories/BackpackInventory";
import Board from "./Board";
import { definiteGameState, latencyGameState } from "./game-state/game-states";
import Game, { GameInteractState } from "./Game";
import { attemptEntitySelection } from "./entity-selection";
import { playSound } from "./sound";
import { attemptToCompleteNode } from "./research";
import { calculateStructurePlaceInfo } from "webgl-test-shared/dist/structures";
import { LimbAction } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { TRIBE_INFO_RECORD, TribeType } from "webgl-test-shared/dist/tribes";
import { STATUS_EFFECT_MODIFIERS } from "webgl-test-shared/dist/status-effects";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { LimbInfo } from "./entity-components/InventoryUseComponent";
import InventoryComponent from "./entity-components/InventoryComponent";
import { ENTITY_TYPE_TO_GHOST_TYPE_MAP, GhostInfo, setGhostInfo } from "./rendering/webgl/entity-ghost-rendering";
import Camera from "./Camera";
import { calculateCursorWorldPositionX, calculateCursorWorldPositionY } from "./mouse";
import { Inventory, Item, ITEM_TYPE_RECORD, ItemType, InventoryName, ITEM_INFO_RECORD, itemInfoIsTool, ConsumableItemInfo, ConsumableItemCategory, PlaceableItemType } from "webgl-test-shared/dist/items/items";
import { playBowFireSound } from "./entity-tick-events";
import { closeCurrentMenu } from "./menus";
import { createAttackPacket } from "./client/packet-creation";

/*
// @Temporary @Incomplete

      canPlace: (): boolean => {
         // The player can only place one tribe totem
         return !Game.tribe.hasTotem;
      },
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.worker_hut]: {
      entityType: EntityType.workerHut,
      width: WORKER_HUT_SIZE,
      height: WORKER_HUT_SIZE,
      canPlace: (): boolean => {
         return Game.tribe.hasTotem && Game.tribe.numHuts < Game.tribe.tribesmanCap;
      },
*/

/** Acceleration of the player while moving without any modifiers. */
const PLAYER_ACCELERATION = 700;

const PLAYER_LIGHTSPEED_ACCELERATION = 15000;

/** Acceleration of the player while slowed. */
const PLAYER_SLOW_ACCELERATION = 400;

export let rightMouseButtonIsPressed = false;
export let leftMouseButtonIsPressed = false;

const hotbarItemAttackCooldowns: Record<number, number> = {};
const offhandItemAttackCooldowns: Record<number, number> = {};

/** Whether the inventory is open or not. */
let _inventoryIsOpen = false;

let currentRightClickEvent: MouseEvent | null = null;

const updateAttackCooldowns = (inventory: Inventory, attackCooldowns: Record<number, number>): void => {
   for (let itemSlot = 1; itemSlot <= inventory.width; itemSlot++) {
      if (attackCooldowns.hasOwnProperty(itemSlot)) {
         attackCooldowns[itemSlot] -= 1 / Settings.TPS;
         if (attackCooldowns[itemSlot] < 0) {
            delete attackCooldowns[itemSlot];
         }
      }
   }
}

export function updatePlayerItems(): void {
   if (definiteGameState.hotbar === null || Player.instance === null) {
      return;
   }

   // @Cleanup: destroy this.

   // const inventoryUseComponent = Player.instance.getComponent(ServerComponentType.inventoryUse);
   // if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
   //    inventoryUseComponent.useInfos[0].act = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   //    // Player.instance.updateBowChargeTexture();
   // } else {
   //    Player.instance.rightActiveItem = null;
   // }
   // if (definiteGameState.offhandInventory.itemSlots.hasOwnProperty(1)) {
   //    Player.instance.leftActiveItem = definiteGameState.offhandInventory.itemSlots[1];
   // } else {
   //    Player.instance.leftActiveItem = null;
   // }
   // Player.instance.updateHands();

   // Player.instance.updateArmourRenderPart(definiteGameState.armourSlot.itemSlots.hasOwnProperty(1) ? definiteGameState.armourSlot.itemSlots[1].type : null);
   // Player.instance.updateGloveRenderPart(definiteGameState.gloveSlot.itemSlots.hasOwnProperty(1) ? definiteGameState.gloveSlot.itemSlots[1].type : null);

   // Player.instance!.updateBowChargeTexture();

   updateAttackCooldowns(definiteGameState.hotbar, hotbarItemAttackCooldowns);
   updateAttackCooldowns(definiteGameState.offhandInventory, offhandItemAttackCooldowns);

   // Tick items
   for (let i = 0; i < definiteGameState.hotbar.items.length; i++) {
      const item = definiteGameState.hotbar.items[i];
      tickItem(item, definiteGameState.hotbar.getItemSlot(item));
   }
}

const attack = (isOffhand: boolean, attackCooldown: number): void => {
   const attackPacket = createAttackPacket();
   Client.sendPacket(attackPacket);

   // Update bow charge cooldown
   if (latencyGameState.mainAction !== LimbAction.chargeBow) {
      const limbIdx = isOffhand ? 1 : 0;
      const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
      const useInfo = inventoryUseComponent.useInfos[limbIdx];

      useInfo.lastAttackTicks = Board.serverTicks;
      useInfo.lastAttackCooldown = attackCooldown;
   }
}

const getSwingTimeMultiplier = (item: Item | undefined): number => {
   let swingTimeMultiplier = 1;

   if (Game.tribe.tribeType === TribeType.barbarians) {
      // 30% slower
      swingTimeMultiplier /= 0.7;
   }

   // Builders swing hammers 30% faster
   const tribeMemberComponent = Player.instance!.getServerComponent(ServerComponentType.tribeMember);
   if (tribeMemberComponent.hasTitle(TribesmanTitle.builder) && typeof item !== "undefined" && ITEM_TYPE_RECORD[item.type] === "hammer") {
      swingTimeMultiplier /= 1.3;
   }

   return swingTimeMultiplier;
}

const getBaseAttackCooldown = (item: Item | undefined, itemLimbInfo: LimbInfo, inventoryComponent: InventoryComponent): number => {
   // @Hack
   if (typeof item === "undefined" || item.type === ItemType.leaf && inventoryComponent.hasInventory(InventoryName.gloveSlot)) {
      const glovesInventory = inventoryComponent.getInventory(InventoryName.gloveSlot);

      const gloves = glovesInventory.itemSlots[1];
      if (typeof gloves !== "undefined" && gloves.type === ItemType.gardening_gloves) {
         return Settings.DEFAULT_ATTACK_COOLDOWN * 1.5;
      }
   }
   
   if (typeof item === "undefined") {
      return Settings.DEFAULT_ATTACK_COOLDOWN;
   }

   const itemInfo = ITEM_INFO_RECORD[item.type];
   if (itemInfoIsTool(item.type, itemInfo) && item.id !== itemLimbInfo.thrownBattleaxeItemID) {
      return itemInfo.attackCooldown;
   }

   return Settings.DEFAULT_ATTACK_COOLDOWN;
}

const attemptInventoryAttack = (inventory: Inventory): boolean => {
   const isOffhand = inventory.name !== InventoryName.hotbar;

   const inventoryComponent = Player.instance!.getServerComponent(ServerComponentType.inventory);
   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   
   const useInfo = inventoryUseComponent.useInfos[isOffhand ? 1 : 0];
   
   const attackCooldowns = isOffhand ? offhandItemAttackCooldowns : hotbarItemAttackCooldowns;
   const selectedItemSlot = useInfo.selectedItemSlot;

   // If on cooldown, don't swing
   if (typeof attackCooldowns[selectedItemSlot] !== "undefined") {
      return false;
   }

   const selectedItem = inventory.itemSlots[selectedItemSlot];

   let attackCooldown = getBaseAttackCooldown(selectedItem, useInfo, inventoryComponent);
   attackCooldown *= getSwingTimeMultiplier(selectedItem);
      
   // @Cleanup: Should be done in attack function
   attackCooldowns[selectedItemSlot] = attackCooldown;

   attack(isOffhand, attackCooldown);

   return true;
}

const attemptAttack = (): void => {
   if (Player.instance === null) return;

   const hotbarAttackDidSucceed = attemptInventoryAttack(definiteGameState.hotbar);
   if (!hotbarAttackDidSucceed && Game.tribe.tribeType === TribeType.barbarians) {
      attemptInventoryAttack(definiteGameState.offhandInventory);
   }
}

interface SelectedItemInfo {
   readonly item: Item;
   readonly itemSlot: number;
   readonly isOffhand: boolean;
}

const getSelectedItemInfo = (): SelectedItemInfo | null => {
   const hotbarItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   if (typeof hotbarItem !== "undefined") {
      return {
         item: hotbarItem,
         itemSlot: latencyGameState.selectedHotbarItemSlot,
         isOffhand: false
      };
   }

   const offhandItem = definiteGameState.offhandInventory.itemSlots[1];
   if (typeof offhandItem !== "undefined") {
      return {
         item: offhandItem,
         itemSlot: 1,
         isOffhand: true
      };
   }

   return null;
}

const clickShouldPreventDefault = (e: MouseEvent): boolean => {
   for (const element of e.composedPath()) {
      if (element instanceof Element && (element.id === "hotbar" || element.id === "crafting-menu" || element.classList.contains("inventory-container"))) {
         return true;
      }
   }
   
   if ((e.target as HTMLElement).id === "game-canvas") {
      return true;
   }

   return false;
}

const createItemUseListeners = (): void => {
   document.addEventListener("mousedown", e => {
      if (Player.instance === null || definiteGameState.hotbar === null || definiteGameState.playerIsDead()) return;

      // Only attempt to use an item if the game canvas was clicked
      if ((e.target as HTMLElement).id !== "game-canvas") {
         return;
      }

      if (Game.getInteractState() === GameInteractState.summonEntity) {
         if (Game.summonPacket === null) {
            console.warn("summon packet is null");
            return;
         }
         
         if (e.button === 0) {
            Game.summonPacket.position[0] = calculateCursorWorldPositionX(e.clientX)!;
            Game.summonPacket.position[1] = calculateCursorWorldPositionY(e.clientY)!;
            Game.summonPacket.rotation = 2 * Math.PI * Math.random();
            
            Client.sendEntitySummonPacket(Game.summonPacket);
         } else if (e.button === 2) {
            // Get out of summon entity mode
            Game.setInteractState(GameInteractState.none);
         }
         return;
      }

      if (e.button === 0) { // Left click
         leftMouseButtonIsPressed = true;
         attemptAttack();
      } else if (e.button === 2) { // Right click
         currentRightClickEvent = e;
         rightMouseButtonIsPressed = true;

         const selectedItemInfo = getSelectedItemInfo();
         if (selectedItemInfo !== null) {
            itemRightClickDown(selectedItemInfo.item, selectedItemInfo.isOffhand, selectedItemInfo.itemSlot);
         }
         
         const didSelectEntity = attemptEntitySelection();
         if (didSelectEntity) {
            e.preventDefault();
         }
         
         attemptToCompleteNode();
      }
   });

   document.addEventListener("mouseup", e => {
      if (Player.instance === null || definiteGameState.hotbar === null || definiteGameState.playerIsDead()) return;

      // Only attempt to use an item if the game canvas was clicked
      if ((e.target as HTMLElement).id !== "game-canvas") {
         return;
      }

      if (e.button === 0) { // Left click
         leftMouseButtonIsPressed = false;
      } else if (e.button === 2) { // Right click
         rightMouseButtonIsPressed = false;

         const selectedItemInfo = getSelectedItemInfo();
         if (selectedItemInfo !== null) {
            itemRightClickUp(selectedItemInfo.item, selectedItemInfo.isOffhand);
         }
      }
   });

   // Stop the context menu from appearing
   document.addEventListener("contextmenu", e => {
      if (clickShouldPreventDefault(e) || (currentRightClickEvent !== null && clickShouldPreventDefault(currentRightClickEvent))) {
         e.preventDefault();
      } else {
         // When the context menu is opened, stop player movement
         clearPressedKeys();
      }

      currentRightClickEvent = null;
   });
}

const createHotbarKeyListeners = (): void => {
   for (let itemSlot = 1; itemSlot <= Settings.INITIAL_PLAYER_HOTBAR_SIZE; itemSlot++) {
      addKeyListener(itemSlot.toString(), () => selectItemSlot(itemSlot));
   }
   addKeyListener("!", () => selectItemSlot(1));
   addKeyListener("@", () => selectItemSlot(2));
   addKeyListener("#", () => selectItemSlot(3));
   addKeyListener("$", () => selectItemSlot(4));
   addKeyListener("%", () => selectItemSlot(5));
   addKeyListener("^", () => selectItemSlot(6));
   addKeyListener("&", () => selectItemSlot(7));
}

const throwHeldItem = (): void => {
   if (Player.instance !== null) {
      const transformComponent = Player.instance.getServerComponent(ServerComponentType.transform);
      Client.sendHeldItemDropPacket(99999, transformComponent.rotation);
   }
}

const hideInventory = (): void => {
   _inventoryIsOpen = false;
   
   CraftingMenu_setCraftingStation(null);
   CraftingMenu_setIsVisible(false);
   BackpackInventoryMenu_setIsVisible(false);

   // If the player is holding an item when their inventory is closed, throw the item out
   if (definiteGameState.heldItemSlot !== null) {
      throwHeldItem();
   }
}
 
/** Creates the key listener to toggle the inventory on and off. */
const createInventoryToggleListeners = (): void => {
   addKeyListener("e", () => {
      const didCloseMenu = closeCurrentMenu();
      if (!didCloseMenu) {
         // Open the crafting menu
         CraftingMenu_setCraftingStation(null);
         CraftingMenu_setIsVisible(true);
      }
   });

   addKeyListener("i", () => {
      if (_inventoryIsOpen) {
         hideInventory();
         return;
      }
   });
   addKeyListener("escape", () => {
      closeCurrentMenu();
   });
}

/** Creates keyboard and mouse listeners for the player. */
export function createPlayerInputListeners(): void {
   createItemUseListeners();
   createHotbarKeyListeners();
   createInventoryToggleListeners();

   document.body.addEventListener("wheel", e => {
      // Don't scroll hotbar if element is being scrolled instead
      const elemPath = e.composedPath() as Array<HTMLElement>;
      for (let i = 0; i < elemPath.length; i++) {
         const elem = elemPath[i];
         // @Hack
         if (typeof elem.style !== "undefined") {
            const overflowY = getComputedStyle(elem).getPropertyValue("overflow-y");
            if (overflowY === "scroll") {
               return;
            }
         }
      }
      
      const scrollDirection = Math.sign(e.deltaY);
      let newSlot = latencyGameState.selectedHotbarItemSlot + scrollDirection;
      if (newSlot <= 0) {
         newSlot += Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      } else if (newSlot > Settings.INITIAL_PLAYER_HOTBAR_SIZE) {
         newSlot -= Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      }
      selectItemSlot(newSlot);
   });

   addKeyListener("q", () => {
      if (Player.instance !== null) {
         const playerTransformComponent = Player.instance.getServerComponent(ServerComponentType.transform);
         const dropAmount = keyIsPressed("shift") ? 99999 : 1;
         Client.sendItemDropPacket(latencyGameState.selectedHotbarItemSlot, dropAmount, playerTransformComponent.rotation);
      }
   });
}

const isCollidingWithCoveredSpikes = (): boolean => {
   const transformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);
   
   for (let i = 0; i < transformComponent.collidingEntities.length; i++) {
      const entity = transformComponent.collidingEntities[i];

      if (entity.hasServerComponent(ServerComponentType.spikes)) {
         const spikesComponent = entity.getServerComponent(ServerComponentType.spikes);
         if (spikesComponent.isCovered) {
            return true;
         }
      }
   }

   return false;
}

const getPlayerMoveSpeedMultiplier = (): number => {
   let moveSpeedMultiplier = 1;

   const statusEffectComponent = Player.instance!.getServerComponent(ServerComponentType.statusEffect);
   for (const statusEffect of statusEffectComponent.statusEffects) {
      moveSpeedMultiplier *= STATUS_EFFECT_MODIFIERS[statusEffect.type].moveSpeedMultiplier;
   }

   moveSpeedMultiplier *= TRIBE_INFO_RECORD[Game.tribe.tribeType].moveSpeedMultiplier;

   const tribeMemberComponent = Player.instance!.getServerComponent(ServerComponentType.tribeMember);
   if (tribeMemberComponent.hasTitle(TribesmanTitle.sprinter)) {
      moveSpeedMultiplier *= 1.2;
   }

   if (isCollidingWithCoveredSpikes()) {
      moveSpeedMultiplier *= 0.5;
   }

   return moveSpeedMultiplier;
}

/** Updates the player's movement to match what keys are being pressed. */
export function updatePlayerMovement(): void {
   // Don't update movement if the player doesn't exist
   if (Player.instance === null) return;
   
   // Get pressed keys
   const wIsPressed = keyIsPressed("w") || keyIsPressed("W") || keyIsPressed("ArrowUp");
   const aIsPressed = keyIsPressed("a") || keyIsPressed("A") || keyIsPressed("ArrowLeft");
   const sIsPressed = keyIsPressed("s") || keyIsPressed("S") || keyIsPressed("ArrowDown");
   const dIsPressed = keyIsPressed("d") || keyIsPressed("D") || keyIsPressed("ArrowRight");

   const hash = (wIsPressed ? 1 : 0) + (aIsPressed ? 2 : 0) + (sIsPressed ? 4 : 0) + (dIsPressed ? 8 : 0);

   // Update rotation
   let moveDirection!: number | null;
   switch (hash) {
      case 0:  moveDirection = null;          break;
      case 1:  moveDirection = 0;   break;
      case 2:  moveDirection = Math.PI * 3/2;       break;
      case 3:  moveDirection = Math.PI * 7/4; break;
      case 4:  moveDirection = Math.PI; break;
      case 5:  moveDirection = null;          break;
      case 6:  moveDirection = Math.PI * 5/4; break;
      case 7:  moveDirection = Math.PI * 3/2;     break;
      case 8:  moveDirection = Math.PI/2;             break;
      case 9:  moveDirection = Math.PI / 4;   break;
      case 10: moveDirection = null;          break;
      case 11: moveDirection = 0;   break;
      case 12: moveDirection = Math.PI * 3/4; break;
      case 13: moveDirection = Math.PI/2;             break;
      case 14: moveDirection = Math.PI; break;
      case 15: moveDirection = null;          break;
   }

   const physicsComponent = Player.instance.getServerComponent(ServerComponentType.physics);

   if (moveDirection !== null) {
      let acceleration: number;
      if (keyIsPressed("l")) {
         acceleration = PLAYER_LIGHTSPEED_ACCELERATION;
      } else if (latencyGameState.mainAction === LimbAction.eat || latencyGameState.mainAction === LimbAction.useMedicine || latencyGameState.mainAction === LimbAction.chargeBow || latencyGameState.mainAction === LimbAction.loadCrossbow || latencyGameState.playerIsPlacingEntity) {
         acceleration = PLAYER_SLOW_ACCELERATION * getPlayerMoveSpeedMultiplier();
      } else {
         acceleration = PLAYER_ACCELERATION * getPlayerMoveSpeedMultiplier();
      }

      if (latencyGameState.lastPlantCollisionTicks >= Board.serverTicks - 1) {
         acceleration *= 0.5;
      }
      
      physicsComponent.acceleration.x = acceleration * Math.sin(moveDirection);
      physicsComponent.acceleration.y = acceleration * Math.cos(moveDirection);
   } else {
      physicsComponent.acceleration.x = 0;
      physicsComponent.acceleration.y = 0;
   }
}

const deselectItem = (item: Item, isOffhand: boolean): void => {
   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   const useInfo = inventoryUseComponent.useInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "spear":
      case "battleaxe":
      case "bow": {
         useInfo.action = LimbAction.none;
         if (isOffhand) {
            latencyGameState.offhandAction = LimbAction.none;
         } else {
            latencyGameState.mainAction = LimbAction.none;
         }
         break;
      }
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = false;
         
         // Clear placeable item ghost
         setGhostInfo(null);
         break;
      }
   }
}

export function selectItem(item: Item): void {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = true;
         break;
      }
   }
}

const unuseItem = (item: Item): void => {
   switch (ITEM_TYPE_RECORD[item.type]) {
      case "healing": {
         const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
         const useInfo = inventoryUseComponent.useInfos[0];
         
         latencyGameState.mainAction = LimbAction.none;
         useInfo.action = LimbAction.none;

         // Also unuse the other hand
         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;
         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            latencyGameState.offhandAction = LimbAction.none;

            const otherUseInfo = inventoryUseComponent.useInfos[1];
            otherUseInfo.action = LimbAction.none;
         }
         break;
      }
   }
}

const itemRightClickDown = (item: Item, isOffhand: boolean, itemSlot: number): void => {
   const transformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);
   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);

   const useInfo = inventoryUseComponent.useInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "healing": {
         const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
         if (definiteGameState.playerHealth >= maxHealth) {
            break;
         }

         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;
         let action: LimbAction;
         switch (itemInfo.consumableItemCategory) {
            case ConsumableItemCategory.food: {
               action = LimbAction.eat;
               break;
            }
            case ConsumableItemCategory.medicine: {
               action = LimbAction.useMedicine;
               break;
            }
         }
            
         useInfo.action = action;
         useInfo.lastEatTicks = Board.serverTicks;

         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            latencyGameState.offhandAction = action;
            latencyGameState.mainAction = action;

            // @Cleanup
            const otherUseInfo = inventoryUseComponent.useInfos[isOffhand ? 0 : 1];
            otherUseInfo.action = action;
            otherUseInfo.lastEatTicks = Board.serverTicks;
         } else {
            if (isOffhand) {
               latencyGameState.offhandAction = action;
            } else {
               latencyGameState.mainAction = action;
            }
         }

         break;
      }
      case "crossbow": {
         if (!definiteGameState.hotbarCrossbowLoadProgressRecord.hasOwnProperty(itemSlot) || definiteGameState.hotbarCrossbowLoadProgressRecord[itemSlot]! < 1) {
            // Start loading crossbow
            useInfo.action = LimbAction.loadCrossbow;
            useInfo.lastCrossbowLoadTicks = Board.serverTicks;
            if (isOffhand) {
               latencyGameState.offhandAction = LimbAction.loadCrossbow;
            } else {
               latencyGameState.mainAction = LimbAction.loadCrossbow;
            }
            playSound("crossbow-load.mp3", 0.4, 1, transformComponent.position);
         } else {
            // Fire crossbow
            Client.sendItemUsePacket();
            playSound("crossbow-fire.mp3", 0.4, 1, transformComponent.position);
         }
         break;
      }
      case "bow": {
         useInfo.action = LimbAction.chargeBow;
         useInfo.lastBowChargeTicks = Board.serverTicks;
         if (isOffhand) {
            latencyGameState.offhandAction = LimbAction.chargeBow;
         } else {
            latencyGameState.mainAction = LimbAction.chargeBow;
         }
         
         playSound("bow-charge.mp3", 0.4, 1, transformComponent.position);

         break;
      }
      case "spear": {
         useInfo.action = LimbAction.chargeSpear;
         useInfo.lastSpearChargeTicks = Board.serverTicks;
         if (isOffhand) {
            latencyGameState.offhandAction = LimbAction.chargeSpear;
         } else {
            latencyGameState.mainAction = LimbAction.chargeSpear;
         }
         break;
      }
      case "battleaxe": {
         // If an axe is already thrown, don't throw another
         if (useInfo.thrownBattleaxeItemID !== -1) {
            break;
         }

         useInfo.action = LimbAction.chargeBattleaxe;
         useInfo.lastBattleaxeChargeTicks = Board.serverTicks;
         if (isOffhand) {
            latencyGameState.offhandAction = LimbAction.chargeBattleaxe;
         } else {
            latencyGameState.mainAction = LimbAction.chargeBattleaxe;
         }
         break;
      }
      case "glove":
      case "armour": {
         Client.sendItemUsePacket();
         break;
      }
      case "placeable": {
         const structureType = ITEM_INFO_RECORD[item.type as PlaceableItemType].entityType;
         const placeInfo = calculateStructurePlaceInfo(transformComponent.position, transformComponent.rotation, structureType, Board.getWorldInfo());
         
         if (placeInfo.isValid) {
            Client.sendItemUsePacket();
            useInfo.lastAttackTicks = Board.serverTicks;
         }

         break;
      }
   }
}

const itemRightClickUp = (item: Item, isOffhand: boolean): void => {
   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   const useInfo = inventoryUseComponent.useInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "healing": {
         unuseItem(item);
         break;
      }
      case "battleaxe":
      case "spear":
      case "bow": {
         if (itemCategory === "battleaxe") {
            if (useInfo.thrownBattleaxeItemID !== -1 || useInfo.action !== LimbAction.chargeBattleaxe) {
               break;
            }

            useInfo.thrownBattleaxeItemID = item.id;

            if (isOffhand) {
               // If an axe is already thrown, don't throw another
               Hotbar_updateLeftThrownBattleaxeItemID(item.id);
            } else {
               Hotbar_updateRightThrownBattleaxeItemID(item.id);
            }
         }

         Client.sendItemUsePacket();

         useInfo.action = LimbAction.none;
         if (isOffhand) {
            latencyGameState.offhandAction = LimbAction.none;
         } else {
            latencyGameState.mainAction = LimbAction.none;
         }

         // @Incomplete: Don't play if bow didn't actually fire an arrow
         playBowFireSound(Player.instance!, item.type);

         break;
      }
      case "crossbow": {
         useInfo.action = LimbAction.none;
         if (isOffhand) {
            latencyGameState.offhandAction = LimbAction.none;
         } else {
            latencyGameState.mainAction = LimbAction.none;
         }
         break;
      }
   }
}

const selectItemSlot = (itemSlot: number): void => {
   if (definiteGameState.hotbar === null || itemSlot === latencyGameState.selectedHotbarItemSlot || Player.instance === null) {
      return;
   }

   // Deselect the previous item and select the new item
   const previousItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   if (typeof previousItem !== "undefined") {
      deselectItem(previousItem, false);
   }
   const newItem = definiteGameState.hotbar.itemSlots[itemSlot];
   if (typeof newItem !== "undefined") {
      selectItem(newItem);
      if (rightMouseButtonIsPressed && ITEM_TYPE_RECORD[newItem.type] === "bow") {
         itemRightClickDown(newItem, false, itemSlot);
      }
   }

   latencyGameState.selectedHotbarItemSlot = itemSlot;
      
   Hotbar_setHotbarSelectedItemSlot(itemSlot);

   const playerInventoryUseComponent = Player.instance.getServerComponent(ServerComponentType.inventoryUse);
   const hotbarUseInfo = playerInventoryUseComponent.getUseInfo(InventoryName.hotbar);
   hotbarUseInfo.selectedItemSlot = itemSlot;

   // @Incomplete
   // @Cleanup: Copy and paste, and shouldn't be here
   // if (Player.instance !== null) {
   //    if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
   //       Player.instance.rightActiveItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   //       // Player.instance.updateBowChargeTexture();
   //    } else {
   //       Player.instance.rightActiveItem = null;
   //    }
   //    if (definiteGameState.offhandInventory.itemSlots.hasOwnProperty(1)) {
   //       Player.instance.leftActiveItem = definiteGameState.offhandInventory.itemSlots[1];
   //    } else {
   //       Player.instance.leftActiveItem = null;
   //    }
   //    // Player.instance!.updateHands();
   // }
}

const tickItem = (item: Item, itemSlot: number): void => {
   const isSelected = itemSlot === latencyGameState.selectedHotbarItemSlot;
   
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "healing": {
         // If the player can no longer eat food without wasting it, stop eating
         const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
         if (isSelected && (latencyGameState.mainAction === LimbAction.eat || latencyGameState.mainAction === LimbAction.useMedicine) && definiteGameState.playerHealth >= maxHealth) {
            unuseItem(item);
         }

         break;
      }
      case "placeable": {
         // 
         // Placeable item ghost
         // 

         if (!isSelected) {
            break;
         }

         const playerTransformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);
         const structureType = ITEM_INFO_RECORD[item.type as PlaceableItemType].entityType;
         const placeInfo = calculateStructurePlaceInfo(Camera.position, playerTransformComponent.rotation, structureType, Board.getWorldInfo());
         
         const ghostInfo: GhostInfo = {
            position: placeInfo.position,
            rotation: placeInfo.rotation,
            ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[placeInfo.entityType],
            tint: placeInfo.isValid ? [1, 1, 1] : [1.5, 0.5, 0.5],
            opacity: 0.5
         };
         setGhostInfo(ghostInfo);

         break;
      }
   }
}

export function removeSelectedItem(item: Item): void {
   if (Player.instance === null) {
      return;
   }

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "healing": {
         unuseItem(item);
         break;
      }
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = false;
      }
   }
}