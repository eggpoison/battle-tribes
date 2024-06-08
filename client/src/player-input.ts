import { addKeyListener, clearPressedKeys, keyIsPressed } from "./keyboard-input";
import { CraftingMenu_setCraftingStation, CraftingMenu_setIsVisible } from "./components/game/menus/CraftingMenu";
import Player from "./entities/Player";
import Client from "./client/Client";
import { Hotbar_setHotbarSelectedItemSlot, Hotbar_updateLeftThrownBattleaxeItemID, Hotbar_updateRightThrownBattleaxeItemID } from "./components/game/inventories/Hotbar";
import { BackpackInventoryMenu_setIsVisible } from "./components/game/inventories/BackpackInventory";
import Board from "./Board";
import { definiteGameState, latencyGameState } from "./game-state/game-states";
import Game from "./Game";
import CircularHitbox from "./hitboxes/CircularHitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import { attemptEntitySelection } from "./entity-selection";
import { playSound } from "./sound";
import { attemptToCompleteNode } from "./research";
import { StructureType, calculateStructurePlaceInfo } from "webgl-test-shared/dist/structures";
import { ConsumableItemCategory, ConsumableItemInfo, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, Inventory, InventoryName, Item, ItemType, PlaceableItemType, itemInfoIsTool } from "webgl-test-shared/dist/items";
import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { AttackPacket, HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { Settings } from "webgl-test-shared/dist/settings";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { TRIBE_INFO_RECORD, TribeType } from "webgl-test-shared/dist/tribes";
import { STATUS_EFFECT_MODIFIERS } from "webgl-test-shared/dist/status-effects";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { Point } from "webgl-test-shared/dist/utils";
import { LimbInfo } from "./entity-components/InventoryUseComponent";
import InventoryComponent from "./entity-components/InventoryComponent";
import { ENTITY_TYPE_TO_GHOST_TYPE_MAP, GhostInfo, setGhostInfo } from "./rendering/webgl/entity-ghost-rendering";
import Camera from "./Camera";
import { Hitbox } from "./hitboxes/hitboxes";
import { WORKER_HUT_SIZE } from "./entity-components/HutComponent";

enum PlaceableItemHitboxType {
   circular,
   rectangular
}

export interface PlaceableEntityInfo {
   readonly entityType: StructureType;
   readonly width: number;
   readonly height: number;
   readonly hitboxType: PlaceableItemHitboxType;
   /** Optionally defines extra criteria for being placed */
   canPlace?(): boolean;
}

let currentMenuCloseFunction: (() => void) | undefined;

/** Acceleration of the player while moving without any modifiers. */
const PLAYER_ACCELERATION = 700;

const PLAYER_LIGHTSPEED_ACCELERATION = 15000;

/** Acceleration of the player while slowed. */
const PLAYER_SLOW_ACCELERATION = 400;

export let rightMouseButtonIsPressed = false;
export let leftMouseButtonIsPressed = false;

// Cleanup: All this item placing logic should be moved to another file

export const PLACEABLE_ENTITY_INFO_RECORD: Record<PlaceableItemType, PlaceableEntityInfo> = {
   [ItemType.workbench]: {
      entityType: EntityType.workbench,
      width: 80,
      height: 80,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.tribe_totem]: {
      entityType: EntityType.tribeTotem,
      width: 120,
      height: 120,
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
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.barrel]: {
      entityType: EntityType.barrel,
      width: 80,
      height: 80,
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.campfire]: {
      entityType: EntityType.campfire,
      width: 104,
      height: 104,
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.furnace]: {
      entityType: EntityType.furnace,
      width: 80,
      height: 80,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.research_bench]: {
      entityType: EntityType.researchBench,
      width: 32 * 4,
      height: 20 * 4,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.wooden_wall]: {
      entityType: EntityType.wall,
      width: 64,
      height: 64,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.planter_box]: {
      entityType: EntityType.planterBox,
      width: 80,
      height: 80,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.wooden_spikes]: {
      entityType: EntityType.floorSpikes,
      width: 40,
      height: 40,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.punji_sticks]: {
      entityType: EntityType.floorPunjiSticks,
      width: 40,
      height: 40,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.ballista]: {
      entityType: EntityType.ballista,
      width: 100,
      height: 100,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.sling_turret]: {
      entityType: EntityType.slingTurret,
      width: 72,
      height: 72,
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.healing_totem]: {
      entityType: EntityType.healingTotem,
      width: 96,
      height: 96,
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.wooden_fence]: {
      entityType: EntityType.fence,
      width: 64,
      height: 16,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.frostshaper]: {
      entityType: EntityType.frostshaper,
      width: 120,
      height: 80,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.stonecarvingTable]: {
      entityType: EntityType.stonecarvingTable,
      width: 120,
      height: 80,
      hitboxType: PlaceableItemHitboxType.rectangular
   }
};

const getPlaceableEntityWidth = (entityType: EntityType, isPlacedOnWall: boolean): number | null => {
   if (entityType === EntityType.floorSpikes) {
      return isPlacedOnWall ? 56 : 48;
   } else if (entityType === EntityType.floorPunjiSticks) {
      return isPlacedOnWall ? 56 : 48;
   }
   return null;
}

const getPlaceableEntityHeight = (entityType: EntityType, isPlacedOnWall: boolean): number | null => {
   if (entityType === EntityType.floorSpikes) {
      return isPlacedOnWall ? 28 : 48;
   } else if (entityType === EntityType.floorPunjiSticks) {
      return isPlacedOnWall ? 32 : 48;
   }
   return null;
}

// @Cleanup: Remove these
const testRectangularHitbox = new RectangularHitbox(1, 0, 0, HitboxCollisionType.soft, 1, -1, -1, 0);
const testCircularHitbox = new CircularHitbox(1, 0, 0, HitboxCollisionType.soft, 1, -1);

const hotbarItemAttackCooldowns: Record<number, number> = {};
const offhandItemAttackCooldowns: Record<number, number> = {};

/** Whether the inventory is open or not. */
let _inventoryIsOpen = false;

export function setMenuCloseFunction(callback: () => void): void {
   currentMenuCloseFunction = callback;
}

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
   const attackPacket: AttackPacket = {
      itemSlot: latencyGameState.selectedHotbarItemSlot,
      attackDirection: Player.instance!.rotation
   };
   Client.sendAttackPacket(attackPacket);

   // Update bow charge cooldown
   if (latencyGameState.mainAction !== LimbAction.chargeBow) {
      const limbIdx = isOffhand ? 1 : 0;
      const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
      const useInfo = inventoryUseComponent.useInfos[limbIdx];

      useInfo.lastAttackTicks = Board.ticks;
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

const createItemUseListeners = (): void => {
   document.addEventListener("mousedown", e => {
      if (Player.instance === null || definiteGameState.hotbar === null || definiteGameState.playerIsDead()) return;

      // Only attempt to use an item if the game canvas was clicked
      if ((e.target as HTMLElement).id !== "game-canvas") {
         return;
      }

      if (e.button === 0) { // Left click
         leftMouseButtonIsPressed = true;
         attemptAttack();
      } else if (e.button === 2) { // Right click
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
      for (const element of e.composedPath()) {
         if ((element as HTMLElement).id === "hotbar" || (element as HTMLElement).id === "crafting-menu") {
            e.preventDefault();
            return;
         }
      }
      
      if ((e.target as HTMLElement).id === "game-canvas") {
         e.preventDefault();
         return;
      }

      // When the context menu is opened, stop player movement
      clearPressedKeys();
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
      Client.sendHeldItemDropPacket(99999, Player.instance.rotation);
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

export function closeCurrentMenu(): boolean {
   if (typeof currentMenuCloseFunction !== "undefined") {
      currentMenuCloseFunction();
      currentMenuCloseFunction = undefined;

      return true;
   }
   
   return false;
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
         const dropAmount = keyIsPressed("shift") ? 99999 : 1;
         Client.sendItemDropPacket(latencyGameState.selectedHotbarItemSlot, dropAmount, Player.instance.rotation);
      }
   });
}

const isCollidingWithCoveredSpikes = (): boolean => {
   for (let i = 0; i < Player.instance!.collidingEntities.length; i++) {
      const entity = Player.instance!.collidingEntities[i];

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

      if (latencyGameState.lastPlantCollisionTicks >= Board.ticks - 1) {
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

// @Cleanup: sucks.
export function canPlaceItem(placePosition: Point, placeRotation: number, item: Item, placingEntityType: EntityType, isPlacedOnWall: boolean): boolean {
   if (!PLACEABLE_ENTITY_INFO_RECORD.hasOwnProperty(item.type)) {
      throw new Error(`Item type '${item.type}' is not placeable.`);
   }
   
   // Check for any special conditions
   const placeableInfo = PLACEABLE_ENTITY_INFO_RECORD[item.type as PlaceableItemType];
   if (typeof placeableInfo.canPlace !== "undefined" && !placeableInfo.canPlace()) {
      return false;
   }

   let width = getPlaceableEntityWidth(placingEntityType, isPlacedOnWall);
   let height = getPlaceableEntityHeight(placingEntityType, isPlacedOnWall);
   if (width === null) {
      width = placeableInfo.width;
   }
   if (height === null) {
      height = placeableInfo.height;
   }

   let placeTestHitbox: Hitbox;
   if (placeableInfo.hitboxType === PlaceableItemHitboxType.circular) {
      testCircularHitbox.radius = width / 2; // For a circular hitbox, width and height will be the same
      placeTestHitbox = testCircularHitbox;
   } else {
      testRectangularHitbox.width = width;
      testRectangularHitbox.height = height;
      testRectangularHitbox.recalculateHalfDiagonalLength();
      testRectangularHitbox.rotation = placeRotation;
      testRectangularHitbox.externalRotation = 0;
      placeTestHitbox = testRectangularHitbox;
   }
   
   placeTestHitbox.offset.x = 0;
   placeTestHitbox.offset.y = 0;
   placeTestHitbox.position.x = placePosition.x;
   placeTestHitbox.position.y = placePosition.y;
   placeTestHitbox.updateHitboxBounds(0);

   // Don't allow placing buildings in borders
   if (placeTestHitbox.bounds[0] < 0 || placeTestHitbox.bounds[1] >= Settings.BOARD_UNITS || placeTestHitbox.bounds[2] < 0 || placeTestHitbox.bounds[3] >= Settings.BOARD_UNITS) {
      return false;
   }

   // 
   // Check for entity collisions
   // 

   const minChunkX = Math.floor(placeTestHitbox.bounds[0] / Settings.CHUNK_UNITS);
   const maxChunkX = Math.floor(placeTestHitbox.bounds[1] / Settings.CHUNK_UNITS);
   const minChunkY = Math.floor(placeTestHitbox.bounds[2] / Settings.CHUNK_UNITS);
   const maxChunkY = Math.floor(placeTestHitbox.bounds[3] / Settings.CHUNK_UNITS);
   
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            for (const hitbox of entity.hitboxes) {   
               if (placeTestHitbox.isColliding(hitbox)) {
                  return false;
               }
            }
         }
      }
   }

   // 
   // Check for wall tile collisions
   // 

   // @Cleanup: Use collision file, remove test hitbox
   // @Speed: Garbage collection
   const tileHitbox = new RectangularHitbox(1, 0, 0, HitboxCollisionType.soft, 1, Settings.TILE_SIZE, Settings.TILE_SIZE, 0);

   const minTileX = Math.floor(placeTestHitbox.bounds[0] / Settings.TILE_SIZE);
   const maxTileX = Math.floor(placeTestHitbox.bounds[1] / Settings.TILE_SIZE);
   const minTileY = Math.floor(placeTestHitbox.bounds[2] / Settings.TILE_SIZE);
   const maxTileY = Math.floor(placeTestHitbox.bounds[3] / Settings.TILE_SIZE);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (!tile.isWall) {
            continue;
         }

         tileHitbox.position.x = (tileX + 0.5) * Settings.TILE_SIZE;
         tileHitbox.position.y = (tileY + 0.5) * Settings.TILE_SIZE;
         tileHitbox.updateHitboxBounds(0);

         if (placeTestHitbox.isColliding(tileHitbox)) {
            return false;
         }
      }
   }

   return true;
}

const itemRightClickDown = (item: Item, isOffhand: boolean, itemSlot: number): void => {
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
         useInfo.lastEatTicks = Board.ticks;

         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            latencyGameState.offhandAction = action;
            latencyGameState.mainAction = action;

            // @Cleanup
            const otherUseInfo = inventoryUseComponent.useInfos[isOffhand ? 0 : 1];
            otherUseInfo.action = action;
            otherUseInfo.lastEatTicks = Board.ticks;
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
            useInfo.lastCrossbowLoadTicks = Board.ticks;
            if (isOffhand) {
               latencyGameState.offhandAction = LimbAction.loadCrossbow;
            } else {
               latencyGameState.mainAction = LimbAction.loadCrossbow;
            }
            playSound("crossbow-load.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
         } else {
            // Fire crossbow
            Client.sendItemUsePacket();
            playSound("crossbow-fire.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
         }
         break;
      }
      case "bow": {
         useInfo.action = LimbAction.chargeBow;
         useInfo.lastBowChargeTicks = Board.ticks;
         if (isOffhand) {
            latencyGameState.offhandAction = LimbAction.chargeBow;
         } else {
            latencyGameState.mainAction = LimbAction.chargeBow;
         }
         
         playSound("bow-charge.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);

         break;
      }
      case "spear": {
         useInfo.action = LimbAction.chargeSpear;
         useInfo.lastSpearChargeTicks = Board.ticks;
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
         useInfo.lastBattleaxeChargeTicks = Board.ticks;
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
         const placeInfo = calculateStructurePlaceInfo(Player.instance!.position, Player.instance!.rotation, structureType, Board.getChunks());
         
         if (canPlaceItem(placeInfo.position, placeInfo.rotation, item, structureType, false)) {
            Client.sendItemUsePacket();
            useInfo.lastAttackTicks = Board.ticks;
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
         switch (item.type) {
            case ItemType.wooden_bow: {
               playSound("bow-fire.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
               break;
            }
            case ItemType.reinforced_bow: {
               playSound("reinforced-bow-fire.mp3", 0.2, 1, Player.instance!.position.x, Player.instance!.position.y);
               break;
            }
            case ItemType.ice_bow: {
               playSound("ice-bow-fire.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
               break;
            }
         }

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

         const structureType = ITEM_INFO_RECORD[item.type as PlaceableItemType].entityType;
         const placeInfo = calculateStructurePlaceInfo(Camera.position, Player.instance!.rotation, structureType, Board.getChunks());
         
         const ghostInfo: GhostInfo = {
            position: placeInfo.position,
            rotation: placeInfo.rotation,
            ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[placeInfo.entityType],
            tint: canPlaceItem(placeInfo.position, placeInfo.rotation, item, structureType, false) ? [1, 1, 1] : [1.5, 0.5, 0.5],
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