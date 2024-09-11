import { addKeyListener, clearPressedKeys, keyIsPressed } from "./keyboard-input";
import { CraftingMenu_setCraftingStation, CraftingMenu_setIsVisible } from "./components/game/menus/CraftingMenu";
import Player from "./entities/Player";
import Client from "./client/Client";
import { Hotbar_setHotbarSelectedItemSlot, Hotbar_updateLeftThrownBattleaxeItemID, Hotbar_updateRightThrownBattleaxeItemID } from "./components/game/inventories/Hotbar";
import { BackpackInventoryMenu_setIsVisible } from "./components/game/inventories/BackpackInventory";
import Board, { getElapsedTimeInSeconds } from "./Board";
import { definiteGameState, latencyGameState } from "./game-state/game-states";
import Game, { GameInteractState } from "./Game";
import { attemptEntitySelection } from "./entity-selection";
import { playSound } from "./sound";
import { attemptToCompleteNode } from "./research";
import { calculateStructurePlaceInfo } from "battletribes-shared/structures";
import { LimbAction } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import { TRIBE_INFO_RECORD, TribeType } from "battletribes-shared/tribes";
import { STATUS_EFFECT_MODIFIERS } from "battletribes-shared/status-effects";
import { TribesmanTitle } from "battletribes-shared/titles";
import { InventoryUseComponentArray } from "./entity-components/InventoryUseComponent";
import { ENTITY_TYPE_TO_GHOST_TYPE_MAP, GhostInfo, setGhostInfo } from "./rendering/webgl/entity-ghost-rendering";
import Camera from "./Camera";
import { calculateCursorWorldPositionX, calculateCursorWorldPositionY } from "./mouse";
import { Item, ITEM_TYPE_RECORD, InventoryName, ITEM_INFO_RECORD, ConsumableItemInfo, ConsumableItemCategory, PlaceableItemType, getItemAttackInfo, ItemType } from "battletribes-shared/items/items";
import { playBowFireSound } from "./entity-tick-events";
import { closeCurrentMenu } from "./menus";
import { createAttackPacket, sendItemDropPacket, sendItemUsePacket, sendStopItemUsePacket } from "./client/packet-creation";
import { HealthComponentArray } from "./entity-components/HealthComponent";
import { InventoryComponentArray } from "./entity-components/InventoryComponent";

interface SelectedItemInfo {
   readonly item: Item;
   readonly itemSlot: number;
   readonly inventoryName: InventoryName;
}

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

/** Amount of time that attack inputs will be buffered */
const ATTACK_COYOTE_TIME = 0.04;

/** Acceleration of the player while moving without any modifiers. */
const PLAYER_ACCELERATION = 900;

const PLAYER_LIGHTSPEED_ACCELERATION = 15000;

/** Acceleration of the player while slowed. */
const PLAYER_SLOW_ACCELERATION = 500;

/** Acceleration of the player for a brief period after being hit */
const PLAYER_DISCOMBOBULATED_ACCELERATION = 300;

export let rightMouseButtonIsPressed = false;
export let leftMouseButtonIsPressed = false;

let hotbarSelectedItemSlot = 1;

   /** Whether the inventory is open or not. */
let _inventoryIsOpen = false;

let currentRightClickEvent: MouseEvent | null = null;

let discombobulationTimer = 0;
/** If > 0, it counts down the remaining time that the attack is buffered. */
let attackBufferTime = 0;

export function getHotbarSelectedItemSlot(): number {
   return hotbarSelectedItemSlot;
}

export function getInstancePlayerAction(inventoryName: InventoryName): LimbAction {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
   const limbInfo = inventoryUseComponent.getLimbInfoByInventoryName(inventoryName);
   return limbInfo.action;
}

/** Distract blind target. Now, discombobulate. */
export function discombobulate(discombobulationTimeSeconds: number): void {
   if (discombobulationTimeSeconds > discombobulationTimer) {
      discombobulationTimer = discombobulationTimeSeconds;
   }
}

// @Cleanup: bad name. mostly updating limbs
export function updatePlayerItems(): void {
   if (Player.instance === null) {
      return;
   }

   discombobulationTimer -= Settings.I_TPS;
   if (discombobulationTimer < 0) {
      discombobulationTimer = 0;
   }

   // @Cleanup: Copynpaste for the action completion all over here. solution: make currentActionIsFinished method on Limb class

   // @Incomplete: only for hotbar so far

   // const inventoryComponent = InventoryComponentArray.getComponent(Player.instance.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance.id);
   const hotbarLimbInfo = inventoryUseComponent.getLimbInfoByInventoryName(InventoryName.hotbar);

   if (hotbarLimbInfo.currentActionPauseTicksRemaining > 0) {
      hotbarLimbInfo.currentActionPauseTicksRemaining--;
   } else {
      hotbarLimbInfo.currentActionElapsedTicks += hotbarLimbInfo.currentActionRate;
   }
   
   // If finished winding attack, switch to doing attack
   if (hotbarLimbInfo.action === LimbAction.windAttack && getElapsedTimeInSeconds(hotbarLimbInfo.currentActionElapsedTicks) * Settings.TPS >= hotbarLimbInfo.currentActionDurationTicks) {
      hotbarLimbInfo.action = LimbAction.attack;
      hotbarLimbInfo.currentActionElapsedTicks = 0;

      const attackInfo = getItemAttackInfo(hotbarLimbInfo.heldItemType);
      hotbarLimbInfo.currentActionDurationTicks = attackInfo.attackTimings.swingTimeTicks;
   }

   // If finished attacking, go to rest
   if (hotbarLimbInfo.action === LimbAction.attack && getElapsedTimeInSeconds(hotbarLimbInfo.currentActionElapsedTicks) * Settings.TPS >= hotbarLimbInfo.currentActionDurationTicks) {
      hotbarLimbInfo.action = LimbAction.returnAttackToRest;
      hotbarLimbInfo.currentActionElapsedTicks = 0;

      const attackInfo = getItemAttackInfo(hotbarLimbInfo.heldItemType);
      hotbarLimbInfo.currentActionDurationTicks = attackInfo.attackTimings.returnTimeTicks;
   }

   // If finished going to rest, set to default
   if (hotbarLimbInfo.action === LimbAction.returnAttackToRest && getElapsedTimeInSeconds(hotbarLimbInfo.currentActionElapsedTicks) * Settings.TPS >= hotbarLimbInfo.currentActionDurationTicks) {
      hotbarLimbInfo.action = LimbAction.none;
   }

   // @Incomplete: Double-check there isn't a tick immediately after depressing the button where this hasn't registered in the limb yet
   // If blocking but not right clicking, return to rest
   if (1+1===2 && hotbarLimbInfo.action === LimbAction.block && !rightMouseButtonIsPressed && getElapsedTimeInSeconds(hotbarLimbInfo.currentActionElapsedTicks) * Settings.TPS >= hotbarLimbInfo.currentActionDurationTicks) {
      const attackInfo = getItemAttackInfo(hotbarLimbInfo.heldItemType);
      hotbarLimbInfo.action = LimbAction.returnBlockToRest;
      hotbarLimbInfo.currentActionElapsedTicks = 0;
      // @Temporary? Perhaps use separate blockReturnTimeTicks.
      hotbarLimbInfo.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks!;

      sendStopItemUsePacket();
   }

   // @Copynpaste
   // If finished returning block to rest, go to rest
   if (hotbarLimbInfo.action === LimbAction.returnBlockToRest && getElapsedTimeInSeconds(hotbarLimbInfo.currentActionElapsedTicks) * Settings.TPS >= hotbarLimbInfo.currentActionDurationTicks) {
      hotbarLimbInfo.action = LimbAction.none;
   }

   // Buffered attacks
   if (attackBufferTime > 0) {
      const didSwing = attemptSwing(InventoryName.hotbar);
      if (didSwing) {
         attackBufferTime = 0;
      }
      
      attackBufferTime -= Settings.I_TPS;
      if (attackBufferTime <= 0) {
         attackBufferTime = 0;
      }
   }

   // Tick held item
   if (hotbarLimbInfo.heldItemType !== null) {
      tickItem(hotbarLimbInfo.heldItemType);
   }
}

const swing = (inventoryName: InventoryName): void => {
   const attackPacket = createAttackPacket();
   Client.sendPacket(attackPacket);

   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);

   const limbInfo = inventoryUseComponent.getLimbInfoByInventoryName(inventoryName);
   const attackInfo = getItemAttackInfo(limbInfo.heldItemType);

   limbInfo.action = LimbAction.windAttack;
   limbInfo.currentActionElapsedTicks = 0;
   limbInfo.currentActionDurationTicks = attackInfo.attackTimings.windupTimeTicks;
   limbInfo.currentActionRate = 1;
}

// @Cleanup: unused?
const getSwingTimeMultiplier = (item: Item | null): number => {
   let swingTimeMultiplier = 1;

   if (Game.tribe.tribeType === TribeType.barbarians) {
      // 30% slower
      swingTimeMultiplier /= 0.7;
   }

   // Builders swing hammers 30% faster
   const tribeMemberComponent = Player.instance!.getServerComponent(ServerComponentType.tribeMember);
   if (tribeMemberComponent.hasTitle(TribesmanTitle.builder) && item !== null && ITEM_TYPE_RECORD[item.type] === "hammer") {
      swingTimeMultiplier /= 1.3;
   }

   return swingTimeMultiplier;
}

// @Incomplete
// const getBaseAttackCooldown = (item: Item | null, itemLimbInfo: LimbInfo, inventoryComponent: InventoryComponent): number => {
//    // @Hack
//    if (item === null || item.type === ItemType.leaf && inventoryComponent.hasInventory(InventoryName.gloveSlot)) {
//       const glovesInventory = inventoryComponent.getInventory(InventoryName.gloveSlot);

//       const gloves = glovesInventory.itemSlots[1];
//       if (typeof gloves !== "undefined" && gloves.type === ItemType.gardening_gloves) {
//          return Settings.DEFAULT_ATTACK_COOLDOWN * 1.5;
//       }
//    }
   
//    if (item === null) {
//       return Settings.DEFAULT_ATTACK_COOLDOWN;
//    }

//    const itemInfo = ITEM_INFO_RECORD[item.type];
//    if (itemInfoIsTool(item.type, itemInfo) && item.id !== itemLimbInfo.thrownBattleaxeItemID) {
//       return itemInfo.attackCooldown;
//    }

//    return Settings.DEFAULT_ATTACK_COOLDOWN;
// }

// @Incomplete
// const getItemAttackCooldown = (item: Item | null, itemLimbInfo: LimbInfo, inventoryComponent: InventoryComponent): number => {
//    let attackCooldown = getBaseAttackCooldown(item, itemLimbInfo, inventoryComponent);
//    attackCooldown *= getSwingTimeMultiplier(item);
//    return attackCooldown;
// }

// @Incomplete
// const attemptInventoryAttack = (inventory: Inventory): boolean => {
//    const isOffhand = inventory.name !== InventoryName.hotbar;

//    const inventoryComponent = Player.instance!.getServerComponent(ServerComponentType.inventory);
//    const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   
//    const useInfo = inventoryUseComponent.useInfos[isOffhand ? 1 : 0];
   
//    const attackCooldowns = isOffhand ? offhandItemAttackCooldowns : hotbarItemAttackCooldowns;
//    const selectedItemSlot = useInfo.selectedItemSlot;

//    // If on cooldown, don't swing
//    if (typeof attackCooldowns[selectedItemSlot] !== "undefined") {
//       return false;
//    }

//    const selectedItem = inventory.itemSlots[selectedItemSlot];

//    let attackCooldown = getBaseAttackCooldown(selectedItem, useInfo, inventoryComponent);
//    attackCooldown *= getSwingTimeMultiplier(selectedItem);
      
//    // @Cleanup: Should be done in attack function
//    attackCooldowns[selectedItemSlot] = attackCooldown;

//    swing(isOffhand, attackCooldown);

//    return true;
// }

const attemptSwing = (inventoryName: InventoryName): boolean => {
   // Only swing if not doing anything
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
   const limbInfo = inventoryUseComponent.getLimbInfoByInventoryName(inventoryName);
   if (limbInfo.action === LimbAction.none) {
      swing(inventoryName);
      return true;
   }
   
   return false;
}

const attemptAttack = (): void => {
   if (Player.instance === null) return;

   let attackDidSucceed = attemptSwing(InventoryName.hotbar);
   if (!attackDidSucceed && Game.tribe.tribeType === TribeType.barbarians) {
      attackDidSucceed = attemptSwing(InventoryName.offhand);
   }

   if (!attackDidSucceed) {
      attackBufferTime = ATTACK_COYOTE_TIME;
   }
}

export function getPlayerSelectedItem(): Item | null {
   if (Player.instance === null) return null;

   const inventoryComponent = InventoryComponentArray.getComponent(Player.instance.id);
   const hotbarInventory = inventoryComponent.getInventory(InventoryName.hotbar)!;
   return hotbarInventory.getItem(hotbarSelectedItemSlot);
}

const getSelectedItemInfo = (): SelectedItemInfo | null => {
   const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
   const hotbarInventory = inventoryComponent.getInventory(InventoryName.hotbar)!;
   
   const heldItem = hotbarInventory.getItem(hotbarSelectedItemSlot);
   if (heldItem !== null) {
      return {
         item: heldItem,
         itemSlot: hotbarSelectedItemSlot,
         inventoryName: InventoryName.hotbar
      };
   }

   const offhand = inventoryComponent.getInventory(InventoryName.offhand)!;
   const offhandHeldItem = offhand.getItem(1);
   if (offhandHeldItem !== null) {
      return {
         item: offhandHeldItem,
         itemSlot: 1,
         inventoryName: InventoryName.offhand
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
      if (Player.instance === null) return;

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
            onItemRightClickDown(selectedItemInfo.item, selectedItemInfo.inventoryName, selectedItemInfo.itemSlot);
         }
         
         const didSelectEntity = attemptEntitySelection();
         if (didSelectEntity) {
            e.preventDefault();
         }
         
         attemptToCompleteNode();
      }
   });

   document.addEventListener("mouseup", e => {
      if (Player.instance === null) return;

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
            onItemRightClickUp(selectedItemInfo.item, selectedItemInfo.inventoryName);
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
   const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
   const heldItemInventory = inventoryComponent.getInventory(InventoryName.heldItemSlot)!;
   if (heldItemInventory.hasItem(1)) {
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
      let newSlot = hotbarSelectedItemSlot + scrollDirection;
      if (newSlot <= 0) {
         newSlot += Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      } else if (newSlot > Settings.INITIAL_PLAYER_HOTBAR_SIZE) {
         newSlot -= Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      }
      selectItemSlot(newSlot);
   });

   addKeyListener("q", () => {
      if (Player.instance !== null) {
         const selectedItemInfo = getSelectedItemInfo();
         if (selectedItemInfo === null) {
            return;
         }

         const isOffhand = selectedItemInfo.inventoryName === InventoryName.offhand;
         const playerTransformComponent = Player.instance.getServerComponent(ServerComponentType.transform);
         const dropAmount = keyIsPressed("shift") ? 99999 : 1;
         sendItemDropPacket(isOffhand, hotbarSelectedItemSlot, dropAmount, playerTransformComponent.rotation);
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
      const playerAction = getInstancePlayerAction(InventoryName.hotbar);
      
      let acceleration: number;
      if (keyIsPressed("l")) {
         acceleration = PLAYER_LIGHTSPEED_ACCELERATION;
      // @Bug: doesn't account for offhand
      } else if (playerAction === LimbAction.eat || playerAction === LimbAction.useMedicine || playerAction === LimbAction.chargeBow || playerAction === LimbAction.chargeSpear || playerAction === LimbAction.loadCrossbow || playerAction === LimbAction.block || latencyGameState.playerIsPlacingEntity) {
         acceleration = PLAYER_SLOW_ACCELERATION * getPlayerMoveSpeedMultiplier();
      } else {
         acceleration = PLAYER_ACCELERATION * getPlayerMoveSpeedMultiplier();
      }

      // If discombobulated, limit the acceleration to the discombobulated acceleration
      if (discombobulationTimer > 0 && acceleration > PLAYER_DISCOMBOBULATED_ACCELERATION) {
         acceleration = PLAYER_DISCOMBOBULATED_ACCELERATION;
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
   const limb = inventoryUseComponent.limbInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "spear":
      case "battleaxe":
      case "bow": {
         limb.action = LimbAction.none;
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

const selectItem = (item: Item): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = true;
         break;
      }
   }
}

const unuseItem = (itemType: ItemType): void => {
   switch (ITEM_TYPE_RECORD[itemType]) {
      case "healing": {
         const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
         const useInfo = inventoryUseComponent.limbInfos[0];
         
         useInfo.action = LimbAction.none;

         // @Bug: won't work when offhand is healing
         // Also unuse the other hand
         const itemInfo = ITEM_INFO_RECORD[itemType] as ConsumableItemInfo;
         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            const otherUseInfo = inventoryUseComponent.limbInfos[1];
            otherUseInfo.action = LimbAction.none;
         }

         // Tell the server to stop using the item
         sendStopItemUsePacket();
         break;
      }
   }
}

const onItemRightClickDown = (item: Item, itemInventoryName: InventoryName, itemSlot: number): void => {
   const transformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);
   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);

   const limbInfo = inventoryUseComponent.getLimbInfoByInventoryName(itemInventoryName);

   // Start blocking
   if (limbInfo.action === LimbAction.none) {
      const attackInfo = getItemAttackInfo(item.type);
      if (attackInfo.attackTimings.blockTimeTicks !== null) {
         limbInfo.action = LimbAction.block;
         limbInfo.currentActionElapsedTicks = 0;
         limbInfo.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks;
         limbInfo.currentActionRate = 1;

         sendItemUsePacket();
         return;
      }
   }

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "healing": {
         const healthComponent = HealthComponentArray.getComponent(Player.instance!.id);
         const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
         if (healthComponent.health >= maxHealth) {
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
            
         limbInfo.action = action;
         limbInfo.lastEatTicks = Board.serverTicks;

         // @Incomplete
         // if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
         //    // @Cleanup
         //    const otherUseInfo = inventoryUseComponent.limbInfos[isOffhand ? 0 : 1];
         //    otherUseInfo.action = action;
         //    otherUseInfo.lastEatTicks = Board.serverTicks;
         // }

         break;
      }
      case "crossbow": {
         if (!definiteGameState.hotbarCrossbowLoadProgressRecord.hasOwnProperty(itemSlot) || definiteGameState.hotbarCrossbowLoadProgressRecord[itemSlot]! < 1) {
            // Start loading crossbow
            limbInfo.action = LimbAction.loadCrossbow;
            limbInfo.lastCrossbowLoadTicks = Board.serverTicks;
            playSound("crossbow-load.mp3", 0.4, 1, transformComponent.position);
         } else {
            // Fire crossbow
            sendItemUsePacket();
            playSound("crossbow-fire.mp3", 0.4, 1, transformComponent.position);
         }
         break;
      }
      case "bow": {
         limbInfo.action = LimbAction.chargeBow;
         limbInfo.lastBowChargeTicks = Board.serverTicks;
         
         playSound("bow-charge.mp3", 0.4, 1, transformComponent.position);

         break;
      }
      case "spear": {
         limbInfo.action = LimbAction.chargeSpear;
         limbInfo.currentActionElapsedTicks = 0;
         break;
      }
      case "battleaxe": {
         // If an axe is already thrown, don't throw another
         if (limbInfo.thrownBattleaxeItemID !== -1) {
            break;
         }

         limbInfo.action = LimbAction.chargeBattleaxe;
         limbInfo.lastBattleaxeChargeTicks = Board.serverTicks;
         break;
      }
      case "glove":
      case "armour": {
         sendItemUsePacket();
         break;
      }
      case "placeable": {
         const structureType = ITEM_INFO_RECORD[item.type as PlaceableItemType].entityType;
         const placeInfo = calculateStructurePlaceInfo(transformComponent.position, transformComponent.rotation, structureType, Board.getWorldInfo());
         
         if (placeInfo.isValid) {
            sendItemUsePacket();
            limbInfo.lastAttackTicks = Board.serverTicks;
         }

         break;
      }
   }
}

const onItemRightClickUp = (item: Item, inventoryName: InventoryName): void => {
   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   const limb = inventoryUseComponent.getLimbInfoByInventoryName(inventoryName);

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "healing": {
         unuseItem(item.type);
         break;
      }
      case "battleaxe":
      case "spear":
      case "bow": {
         if (itemCategory === "battleaxe") {
            if (limb.thrownBattleaxeItemID !== -1 || limb.action !== LimbAction.chargeBattleaxe) {
               break;
            }

            limb.thrownBattleaxeItemID = item.id;

            // @Hack?
            if (inventoryName === InventoryName.offhand) {
               // If an axe is already thrown, don't throw another
               Hotbar_updateLeftThrownBattleaxeItemID(item.id);
            } else {
               Hotbar_updateRightThrownBattleaxeItemID(item.id);
            }
         }

         limb.action = LimbAction.none;
         
         sendItemUsePacket();
         // @Incomplete: Don't play if bow didn't actually fire an arrow
         playBowFireSound(Player.instance!, item.type);

         break;
      }
      case "crossbow": {
         limb.action = LimbAction.none;
         break;
      }
   }
}

export function selectItemSlot(itemSlot: number): void {
   if (Player.instance === null || itemSlot === hotbarSelectedItemSlot) {
      return;
   }

   // Don't switch if the player is blocking
   const playerAction = getInstancePlayerAction(InventoryName.hotbar);
   if (playerAction === LimbAction.block || playerAction === LimbAction.returnBlockToRest) {
      playSound("error.mp3", 0.4, 1, Camera.position);
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
   const hotbarInventory = inventoryComponent.getInventory(InventoryName.hotbar)!;

   // Deselect the previous item and select the new item
   const previousItem = hotbarInventory.itemSlots[hotbarSelectedItemSlot];
   if (typeof previousItem !== "undefined") {
      deselectItem(previousItem, false);
   }
   const newItem = hotbarInventory.itemSlots[itemSlot];
   if (typeof newItem !== "undefined") {
      selectItem(newItem);
      if (rightMouseButtonIsPressed) {
         onItemRightClickDown(newItem, InventoryName.hotbar, itemSlot);
      }
   }

   hotbarSelectedItemSlot = itemSlot;
      
   Hotbar_setHotbarSelectedItemSlot(itemSlot);

   const playerInventoryUseComponent = Player.instance.getServerComponent(ServerComponentType.inventoryUse);
   const hotbarUseInfo = playerInventoryUseComponent.getLimbInfoByInventoryName(InventoryName.hotbar);
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

const tickItem = (itemType: ItemType): void => {
   const itemCategory = ITEM_TYPE_RECORD[itemType];
   switch (itemCategory) {
      case "healing": {
         // If the player can no longer eat food without wasting it, stop eating
         const healthComponent = HealthComponentArray.getComponent(Player.instance!.id);
         const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
         const playerAction = getInstancePlayerAction(InventoryName.hotbar);
         if ((playerAction === LimbAction.eat || playerAction === LimbAction.useMedicine) && healthComponent.health >= maxHealth) {
            unuseItem(itemType);
         }

         break;
      }
      case "placeable": {
         // 
         // Placeable item ghost
         // 

         const playerTransformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);
         const structureType = ITEM_INFO_RECORD[itemType as PlaceableItemType].entityType;
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