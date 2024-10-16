import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import AttackChargeBar from "./AttackChargeBar";
import { EntityID, EntityType, LimbAction } from "../../../../shared/src/entities";
import { Item, InventoryName, getItemAttackInfo, ITEM_TYPE_RECORD, ItemType, ITEM_INFO_RECORD, ConsumableItemInfo, ConsumableItemCategory, PlaceableItemType, BowItemInfo, PlaceableItemInfo } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { STATUS_EFFECT_MODIFIERS } from "../../../../shared/src/status-effects";
import { calculateStructurePlaceInfo } from "../../../../shared/src/structures";
import { TribesmanTitle } from "../../../../shared/src/titles";
import { TribeType, TRIBE_INFO_RECORD } from "../../../../shared/src/tribes";
import Board, { getElapsedTimeInSeconds } from "../../Board";
import Camera from "../../Camera";
import Client from "../../client/Client";
import { sendStopItemUsePacket, createAttackPacket, sendItemDropPacket, sendItemUsePacket, sendStartItemUsePacket } from "../../client/packet-creation";
import Player from "../../entities/Player";
import { DamageBoxComponentArray } from "../../entity-components/server-components/DamageBoxComponent";
import { HealthComponentArray } from "../../entity-components/server-components/HealthComponent";
import { InventoryComponentArray } from "../../entity-components/server-components/InventoryComponent";
import { InventoryUseComponentArray, LimbInfo } from "../../entity-components/server-components/InventoryUseComponent";
import { attemptEntitySelection } from "../../entity-selection";
import { playBowFireSound } from "../../entity-tick-events";
import Game from "../../Game";
import { latencyGameState, definiteGameState } from "../../game-state/game-states";
import { addKeyListener, keyIsPressed } from "../../keyboard-input";
import { closeCurrentMenu } from "../../menus";
import { setGhostInfo, GhostInfo, ENTITY_TYPE_TO_GHOST_TYPE_MAP, createEntityGhost, removeEntityGhost } from "../../rendering/webgl/entity-ghost-rendering";
import { attemptToCompleteNode } from "../../research";
import { playSound } from "../../sound";
import { BackpackInventoryMenu_setIsVisible } from "./inventories/BackpackInventory";
import Hotbar, { Hotbar_updateLeftThrownBattleaxeItemID, Hotbar_updateRightThrownBattleaxeItemID, Hotbar_setHotbarSelectedItemSlot } from "./inventories/Hotbar";
import { CraftingMenu_setCraftingStation, CraftingMenu_setIsVisible } from "./menus/CraftingMenu";
import { addHitboxToEntity, createTransformComponent, TransformComponentArray, updateEntityPosition } from "../../entity-components/server-components/TransformComponent";
import { AttackVars, copyCurrentLimbState, copyLimbState, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BLOCKING_LIMB_STATE, TRIBESMAN_RESTING_LIMB_STATE } from "../../../../shared/src/attack-patterns";
import { PhysicsComponentArray } from "../../entity-components/server-components/PhysicsComponent";
import { getCurrentLayer, getEntityLayer, getEntityRenderInfo, getEntityType, registerBasicEntityInfo, removeBasicEntityInfo } from "../../world";
import { TribeMemberComponentArray } from "../../entity-components/server-components/TribeMemberComponent";
import { SpikesComponentArray } from "../../entity-components/server-components/SpikesComponent";
import { StatusEffectComponentArray } from "../../entity-components/server-components/StatusEffectComponent";
import { EntityComponents, ServerComponentType } from "../../../../shared/src/components";
import { createEntity } from "../../entity-class-record";
import { createComponent } from "../../entity-components/component-creation";
import { getServerComponentArray } from "../../entity-components/ComponentArray";
import { EntityRenderInfo } from "../../Entity";
import { addEntityToRenderHeightMap } from "../../rendering/webgl/entity-rendering";
import { registerDirtyEntity } from "../../rendering/render-part-matrices";
import { thingIsRenderPart } from "../../render-parts/render-parts";
import { ClientHitbox } from "../../boxes";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";

export interface ItemRestTime {
   remainingTimeTicks: number;
   durationTicks: number;
}

export interface GameInteractableLayerProps {
   readonly cinematicModeIsEnabled: boolean;
}

interface SelectedItemInfo {
   readonly item: Item;
   readonly itemSlot: number;
   readonly inventoryName: InventoryName;
}

const enum BufferedInputType {
   attack,
   block
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

/** Amount of time that attack/block inputs will be buffered */
const INPUT_COYOTE_TIME = 0.05;

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

let discombobulationTimer = 0;

/** If > 0, it counts down the remaining time that the attack is buffered. */
let attackBufferTime = 0;
let bufferedInputType = BufferedInputType.attack;
let bufferedInputInventory = InventoryName.hotbar;

let placeableEntityGhost: EntityID = 0;

const createItemRestTimes = (num: number): Array<ItemRestTime> => {
   const restTimes = new Array<ItemRestTime>();
   for (let i = 0; i < num; i++) {
      restTimes.push({
         remainingTimeTicks: 0,
         durationTicks: 0
      });
   }
   return restTimes;
}

// @Hack
let GameInteractableLayer_setChargeInfo: (inventoryName: InventoryName, elapsedTicks: number, duration: number) => void = () => {};

// @Hack
export let GameInteractableLayer_setItemRestTime: (inventoryName: InventoryName, itemSlot: number, restTimeTicks: number) => void = () => {};
// @Hack
let GameInteractableLayer_update: () => void = () => {};
// @Hack
let GameInteractableLayer_getHotbarRestTimes: () => Array<ItemRestTime> = () => [];

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

const hasBlockedAttack = (limb: LimbInfo): boolean => {
   const damageBoxComponent = DamageBoxComponentArray.getComponent(Player.instance!.id);

   for (const blockBox of damageBoxComponent.blockBoxes) {
      if (blockBox.associatedLimbInventoryName === limb.inventoryName && blockBox.hasBlocked) {
         return true;
      }
   }

   return false;
}

const itemIsResting = (itemSlot: number): boolean => {
   // @Hack
   const restTime = GameInteractableLayer_getHotbarRestTimes()[itemSlot - 1];
   return restTime.remainingTimeTicks > 0;
}

export function cancelAttack(limb: LimbInfo): void {
   const attackInfo = getItemAttackInfo(limb.heldItemType);

   limb.action = LimbAction.returnAttackToRest;
   limb.currentActionElapsedTicks = 0;
   limb.currentActionDurationTicks = attackInfo.attackTimings.returnTimeTicks * getAttackTimeMultiplier(limb.heldItemType);

   limb.currentActionStartLimbState = limb.currentActionEndLimbState;
   // @Speed: Garbage collection
   limb.currentActionEndLimbState = copyLimbState(TRIBESMAN_RESTING_LIMB_STATE);
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

   for (let i = 0; i < 2; i++) {
      const inventoryName = i === 0 ? InventoryName.hotbar : InventoryName.offhand;
      const selectedItemSlot = i === 0 ? hotbarSelectedItemSlot : 1;
      
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance.id);
      const limb = inventoryUseComponent.getLimbInfoByInventoryName(inventoryName);

      if (limb.currentActionPauseTicksRemaining > 0) {
         limb.currentActionPauseTicksRemaining--;
      } else {
         limb.currentActionElapsedTicks += limb.currentActionRate;
      }

      // If the item is resting, the player isn't able to use it
      if (limb.action === LimbAction.block && itemIsResting(selectedItemSlot)) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);
         
         // @Copynpaste

         limb.action = LimbAction.returnBlockToRest;
         limb.currentActionElapsedTicks = 0;
         // @Temporary? Perhaps use separate blockReturnTimeTicks.
         limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks!;
         // The shield did a block, so it returns to rest twice as fast
         limb.currentActionRate = 2;

         sendStopItemUsePacket();
      }
      
      // If finished winding attack, switch to doing attack
      if (limb.action === LimbAction.windAttack && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);

         limb.action = LimbAction.attack;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = attackInfo.attackTimings.swingTimeTicks * getAttackTimeMultiplier(limb.heldItemType);

         // @Speed: Garbage collection
         limb.currentActionStartLimbState = copyLimbState(attackInfo.attackPattern!.windedBack);
         // @Speed: Garbage collection
         limb.currentActionEndLimbState = copyLimbState(attackInfo.attackPattern!.swung);

         const transformComponent = TransformComponentArray.getComponent(Player.instance!.id);
         const physicsComponent = PhysicsComponentArray.getComponent(Player.instance!.id);

         // Add extra range for moving attacks
         const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
         const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
         if (vx !== 0 || vy !== 0) {
            const velocityMagnitude = Math.sqrt(vx * vx + vy * vy);
            const attackAlignment = (vx * Math.sin(transformComponent.rotation) + vy * Math.cos(transformComponent.rotation)) / velocityMagnitude;
            if (attackAlignment > 0) {
               const extraAmount = AttackVars.MAX_EXTRA_ATTACK_RANGE * Math.min(velocityMagnitude / AttackVars.MAX_EXTRA_ATTACK_RANGE_SPEED);
               limb.currentActionEndLimbState.extraOffsetY += extraAmount;
            }
         }
      }

      // If finished attacking, go to rest
      if (limb.action === LimbAction.attack && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         cancelAttack(limb);
      }

      // If finished going to rest, set to default
      if (limb.action === LimbAction.returnAttackToRest && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.none;

         const attackInfo = getItemAttackInfo(limb.heldItemType);
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = attackInfo.attackTimings.restTimeTicks;
      }

      // If finished engaging block, go to block
      if (limb.action === LimbAction.engageBlock && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.block;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;
      }

      // @Incomplete: Double-check there isn't a tick immediately after depressing the button where this hasn't registered in the limb yet
      // If blocking but not right clicking, return to rest
      if (limb.action === LimbAction.block && !rightMouseButtonIsPressed) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);
         limb.action = LimbAction.returnBlockToRest;
         limb.currentActionElapsedTicks = 0;
         // @Temporary? Perhaps use separate blockReturnTimeTicks.
         limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks!;
         limb.currentActionRate = hasBlockedAttack(limb) ? 2 : 1;

         sendStopItemUsePacket();
      }

      // @Copynpaste
      // If finished returning block to rest, go to rest
      if (limb.action === LimbAction.returnBlockToRest && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.none;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;
      }

      // If finished feigning attack, go to rest
      if (limb.action === LimbAction.feignAttack && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.none;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;
      }

      if (limb.action === LimbAction.windShieldBash && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.pushShieldBash;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_PUSH_TIME_TICKS;
      }

      if (limb.action === LimbAction.pushShieldBash && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.returnShieldBashToRest;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_RETURN_TIME_TICKS;
      }

      if (limb.action === LimbAction.returnShieldBashToRest && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TPS >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.block;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_RETURN_TIME_TICKS;
      }

      // Buffered attacks
      if (inventoryName === bufferedInputInventory && (attackBufferTime > 0 || (bufferedInputType === BufferedInputType.block && rightMouseButtonIsPressed))) {
         switch (bufferedInputType) {
            case BufferedInputType.attack: {
               if (limb.action === LimbAction.none && limb.currentActionElapsedTicks >= limb.currentActionDurationTicks) {
                  const didSwing = tryToSwing(inventoryName);
                  if (didSwing) {
                     attackBufferTime = 0;
                  }
               }
               break;
            }
            case BufferedInputType.block: {
               if (limb.action === LimbAction.none && limb.heldItemType !== null) {
                  onItemRightClickDown(limb.heldItemType, inventoryName, selectedItemSlot);
               }
               break;
            }
         }
         
         attackBufferTime -= Settings.I_TPS;
         if (attackBufferTime <= 0) {
            attackBufferTime = 0;
         }
      }

      // Update attack charge bar
      let attackElapsedTicks = -1;
      let attackDuration = -1;
      if (limb.action === LimbAction.windAttack || limb.action === LimbAction.attack || limb.action === LimbAction.returnAttackToRest || (limb.action === LimbAction.none && limb.currentActionDurationTicks > 0)) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);

         switch (limb.action) {
            case LimbAction.windAttack: {
               attackElapsedTicks = limb.currentActionElapsedTicks;
               break;
            }
            case LimbAction.attack: {
               attackElapsedTicks = attackInfo.attackTimings.windupTimeTicks * getAttackTimeMultiplier(limb.heldItemType) + limb.currentActionElapsedTicks;
               break;
            }
            case LimbAction.returnAttackToRest: {
               attackElapsedTicks = (attackInfo.attackTimings.windupTimeTicks + attackInfo.attackTimings.swingTimeTicks) * getAttackTimeMultiplier(limb.heldItemType) + limb.currentActionElapsedTicks;
               break;
            }
            case LimbAction.none: {
               attackElapsedTicks = (attackInfo.attackTimings.windupTimeTicks + attackInfo.attackTimings.swingTimeTicks + attackInfo.attackTimings.returnTimeTicks) * getAttackTimeMultiplier(limb.heldItemType) + limb.currentActionElapsedTicks;
               break;
            }
         }

         attackDuration = (attackInfo.attackTimings.windupTimeTicks + attackInfo.attackTimings.swingTimeTicks + attackInfo.attackTimings.returnTimeTicks) * getAttackTimeMultiplier(limb.heldItemType) + attackInfo.attackTimings.restTimeTicks;
      } else {
         attackElapsedTicks = -1;
         attackDuration = -1;
      }
      // @Hack
      GameInteractableLayer_setChargeInfo(inventoryName, attackElapsedTicks, attackDuration);
   
      // Tick held item
      if (limb.heldItemType !== null) {
         tickItem(limb.heldItemType);
      }
   }

   // @Hack @Temporary
   GameInteractableLayer_update();
}

const tryToSwing = (inventoryName: InventoryName): boolean => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);

   const limb = inventoryUseComponent.getLimbInfoByInventoryName(inventoryName);
   const attackInfo = getItemAttackInfo(limb.heldItemType);

   // Shield-bash
   if (attackInfo.attackPattern === null) {
      if (limb.action === LimbAction.block) {
         limb.action = LimbAction.windShieldBash;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_WINDUP_TIME_TICKS;
         limb.currentActionRate = 1;

         // @Speed: Garbage collection
         limb.currentActionStartLimbState = copyLimbState(SHIELD_BLOCKING_LIMB_STATE);
         // @Speed: Garbage collection
         limb.currentActionEndLimbState = copyLimbState(SHIELD_BASH_WIND_UP_LIMB_STATE);

         const attackPacket = createAttackPacket();
         Client.sendPacket(attackPacket);
      }
      return false;
   }

   if (limb.action !== LimbAction.none || limb.currentActionElapsedTicks < limb.currentActionDurationTicks) {
      return false;
   }

   limb.action = LimbAction.windAttack;
   limb.currentActionElapsedTicks = 0;
   limb.currentActionDurationTicks = attackInfo.attackTimings.windupTimeTicks * getAttackTimeMultiplier(limb.heldItemType);
   limb.currentActionRate = 1;

   // @Speed: Garbage collection
   limb.currentActionStartLimbState = copyLimbState(TRIBESMAN_RESTING_LIMB_STATE);
   // @Speed: Garbage collection
   limb.currentActionEndLimbState = copyLimbState(attackInfo.attackPattern.windedBack);

   const attackPacket = createAttackPacket();
   Client.sendPacket(attackPacket);

   return true;
}

// @Cleanup: unused?
const getAttackTimeMultiplier = (itemType: ItemType | null): number => {
   let swingTimeMultiplier = 1;

   if (Game.tribe.tribeType === TribeType.barbarians) {
      // 30% slower
      swingTimeMultiplier /= 0.7;
   }

   // Builders swing hammers 30% faster
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(Player.instance!.id);
   if (tribeMemberComponent.hasTitle(TribesmanTitle.builder) && itemType !== null && ITEM_TYPE_RECORD[itemType] === "hammer") {
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

const attemptAttack = (): void => {
   if (Player.instance === null) return;

   let attackDidSucceed = tryToSwing(InventoryName.hotbar);
   if (!attackDidSucceed && Game.tribe.tribeType === TribeType.barbarians) {
      attackDidSucceed = tryToSwing(InventoryName.offhand);
   }

   if (!attackDidSucceed) {
      attackBufferTime = INPUT_COYOTE_TIME;
      bufferedInputType = BufferedInputType.attack;
      bufferedInputInventory = InventoryName.hotbar;
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

const onGameMouseDown = (e: React.MouseEvent): void => {
   if (Player.instance === null) return;

   if (e.button === 0) { // Left click
      leftMouseButtonIsPressed = true;
      attemptAttack();
   } else if (e.button === 2) { // Right click
      rightMouseButtonIsPressed = true;

      const selectedItemInfo = getSelectedItemInfo();
      if (selectedItemInfo !== null) {
         onItemRightClickDown(selectedItemInfo.item.type, selectedItemInfo.inventoryName, selectedItemInfo.itemSlot);

         // Special case: Barbarians can eat with both hands at once
         if (selectedItemInfo.inventoryName === InventoryName.hotbar && ITEM_TYPE_RECORD[selectedItemInfo.item.type] === "healing") {
            const inventoryComponent = InventoryComponentArray.getComponent(Player.instance.id);
            const offhandInventory = inventoryComponent.getInventory(InventoryName.offhand)!;
            const offhandHeldItem = offhandInventory.getItem(1);
            if (offhandHeldItem !== null) {
               onItemRightClickDown(offhandHeldItem.type, InventoryName.offhand, 1);
            }
         }
      }
      
      const didSelectEntity = attemptEntitySelection();
      if (didSelectEntity) {
         e.preventDefault();
      }
      
      attemptToCompleteNode();
   }
}

const onGameMouseUp = (e: React.MouseEvent): void => {
   if (Player.instance === null) return;

   if (e.button === 0) { // Left click
      leftMouseButtonIsPressed = false;
   } else if (e.button === 2) { // Right click
      rightMouseButtonIsPressed = false;

      const selectedItemInfo = getSelectedItemInfo();
      if (selectedItemInfo !== null) {
         onItemRightClickUp(selectedItemInfo.item, selectedItemInfo.inventoryName);
      }
   }
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
      const transformComponent = TransformComponentArray.getComponent(Player.instance.id);
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
         const playerTransformComponent = TransformComponentArray.getComponent(Player.instance.id);
         const dropAmount = keyIsPressed("shift") ? 99999 : 1;
         sendItemDropPacket(isOffhand, hotbarSelectedItemSlot, dropAmount, playerTransformComponent.rotation);
      }
   });
}

const isCollidingWithCoveredSpikes = (): boolean => {
   const transformComponent = TransformComponentArray.getComponent(Player.instance!.id);
   
   for (let i = 0; i < transformComponent.collidingEntities.length; i++) {
      const entity = transformComponent.collidingEntities[i];

      if (SpikesComponentArray.hasComponent(entity.id)) {
         const spikesComponent = SpikesComponentArray.getComponent(entity.id);
         if (spikesComponent.isCovered) {
            return true;
         }
      }
   }

   return false;
}

const getPlayerMoveSpeedMultiplier = (moveDirection: number): number => {
   let moveSpeedMultiplier = 1;

   const statusEffectComponent = StatusEffectComponentArray.getComponent(Player.instance!.id);
   for (const statusEffect of statusEffectComponent.statusEffects) {
      moveSpeedMultiplier *= STATUS_EFFECT_MODIFIERS[statusEffect.type].moveSpeedMultiplier;
   }

   moveSpeedMultiplier *= TRIBE_INFO_RECORD[Game.tribe.tribeType].moveSpeedMultiplier;

   const tribeMemberComponent = TribeMemberComponentArray.getComponent(Player.instance!.id);
   if (tribeMemberComponent.hasTitle(TribesmanTitle.sprinter)) {
      moveSpeedMultiplier *= 1.2;
   }

   if (isCollidingWithCoveredSpikes()) {
      moveSpeedMultiplier *= 0.5;
   }

   const transformComponent = TransformComponentArray.getComponent(Player.instance!.id);
   // Get how aligned the intended movement direction and the player's rotation are
   const directionAlignmentDot = Math.sin(moveDirection) * Math.sin(transformComponent.rotation) + Math.cos(moveDirection) * Math.cos(transformComponent.rotation);
   // Move 15% slower if you're accelerating away from where you're moving
   if (directionAlignmentDot < 0) {
      const reductionMultiplier = -directionAlignmentDot;
      moveSpeedMultiplier *= 1 - 0.15 * reductionMultiplier;
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
      case 1:  moveDirection = 0;             break;
      case 2:  moveDirection = Math.PI * 3/2; break;
      case 3:  moveDirection = Math.PI * 7/4; break;
      case 4:  moveDirection = Math.PI;       break;
      case 5:  moveDirection = null;          break;
      case 6:  moveDirection = Math.PI * 5/4; break;
      case 7:  moveDirection = Math.PI * 3/2; break;
      case 8:  moveDirection = Math.PI/2;     break;
      case 9:  moveDirection = Math.PI / 4;   break;
      case 10: moveDirection = null;          break;
      case 11: moveDirection = 0;             break;
      case 12: moveDirection = Math.PI * 3/4; break;
      case 13: moveDirection = Math.PI/2;     break;
      case 14: moveDirection = Math.PI;       break;
      case 15: moveDirection = null;          break;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(Player.instance.id);

   if (moveDirection !== null) {
      const playerAction = getInstancePlayerAction(InventoryName.hotbar);
      
      let acceleration: number;
      if (keyIsPressed("l")) {
         acceleration = PLAYER_LIGHTSPEED_ACCELERATION;
      // @Bug: doesn't account for offhand
      } else if (playerAction === LimbAction.eat || playerAction === LimbAction.useMedicine || playerAction === LimbAction.chargeBow || playerAction === LimbAction.chargeSpear || playerAction === LimbAction.loadCrossbow || playerAction === LimbAction.block || playerAction === LimbAction.windShieldBash || playerAction === LimbAction.pushShieldBash || playerAction === LimbAction.returnShieldBashToRest || latencyGameState.playerIsPlacingEntity) {
         acceleration = PLAYER_SLOW_ACCELERATION;
      } else {
         acceleration = PLAYER_ACCELERATION;
      }

      // If discombobulated, limit the acceleration to the discombobulated acceleration
      if (discombobulationTimer > 0 && acceleration > PLAYER_DISCOMBOBULATED_ACCELERATION) {
         acceleration = PLAYER_DISCOMBOBULATED_ACCELERATION;
      }

      acceleration *= getPlayerMoveSpeedMultiplier(moveDirection);

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

const selectItem = (item: Item): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = true;

         // Create a ghost entity

         // @Incomplete: Will miss out on any client components
         // @Incomplete: Make sure this will work when the player changes layers
         
         const layer = getCurrentLayer();
         const transformComponent = TransformComponentArray.getComponent(Player.instance!.id);
         
         const itemInfo = ITEM_INFO_RECORD[item.type] as PlaceableItemInfo;
         const entityType = itemInfo.entityType;
         
         const placeInfo = calculateStructurePlaceInfo(transformComponent.position, transformComponent.rotation, entityType, layer.getWorldInfo());

         // @Incomplete: Fix conflicts with server entities
         // @Incomplete: Make sure there can be an arbitrary amount of entity ghosts
         const entityID = 1;
         const entity = createEntity(entityID, entityType);
         
         const renderInfo = new EntityRenderInfo(entityID);
         registerBasicEntityInfo(entity, entityType, 0, layer, renderInfo);

         const componentTypes = EntityComponents[entityType];
         for (let i = 0; i < componentTypes.length; i++) {
            const componentType = componentTypes[i];

            let component!: object;
            switch (componentType) {
               case ServerComponentType.transform: {
                  const hitboxes = new Array<ClientHitbox>();
                  for (let i = 0; i < placeInfo.hitboxes.length; i++) {
                     const hitbox = placeInfo.hitboxes[i];
                     const clientHitbox = new ClientHitbox(hitbox.box, hitbox.mass, hitbox.collisionType, hitbox.collisionBit, hitbox.collisionMask, hitbox.flags, i);
                     hitboxes.push(clientHitbox);
                  }
                  
                  const position = placeInfo.position.copy();
                  component = createTransformComponent(position, placeInfo.rotation, hitboxes, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
                  break;
               }
               default: {
                  throw new Error(componentType.toString());
               }
            }

            const componentArray = getServerComponentArray(componentType);
            componentArray.addComponent(entityID, component);
         }

         entity.callOnLoadFunctions();

         // @Incomplete: why does this compound? it's because all the ghosts are stacking and not being removed
         for (let i = 0; i < renderInfo.allRenderThings.length; i++) {
            const renderThing = renderInfo.allRenderThings[i];
            if (thingIsRenderPart(renderThing)) {
               renderThing.opacity *= 0.5;
            }
         }
         
         // @Hack @Copynpaste from addEntity
         addEntityToRenderHeightMap(renderInfo);
         
         placeableEntityGhost = entityID;
         createEntityGhost(entityID);
         
         registerDirtyEntity(entityID);
         break;
      }
   }
}

const deselectItem = (item: Item, isOffhand: boolean): void => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
   const limb = inventoryUseComponent.limbInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "healing": {
         unuseItem(item.type);
         break;
      }
      case "spear":
      case "battleaxe":
      case "bow": {
         limb.action = LimbAction.none;
         sendStopItemUsePacket();
         break;
      }
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = false;

         // Clear entity ghost
         if (placeableEntityGhost !== 0) {
            const entityType = getEntityType(placeableEntityGhost);
            const componentTypes = EntityComponents[entityType];

            // @Hack @Copynpaste from addEntity
            for (let i = 0; i < componentTypes.length; i++) {
               const componentType = componentTypes[i];
               const componentArray = getServerComponentArray(componentType);
               if (typeof componentArray.onRemove !== "undefined" && componentArray.hasComponent(placeableEntityGhost)) {
                  componentArray.onRemove(placeableEntityGhost);
               }
            }

            // Remove components
            for (let i = 0; i < componentTypes.length; i++) {
               const componentType = componentTypes[i];
               const componentArray = getServerComponentArray(componentType);
               componentArray.removeComponent(placeableEntityGhost);
            }
         
            // @Hack @Copynpaste from addEntity
            const renderInfo = getEntityRenderInfo(placeableEntityGhost);
            addEntityToRenderHeightMap(renderInfo);
   
            removeBasicEntityInfo(placeableEntityGhost);

            removeEntityGhost(placeableEntityGhost);
            
            placeableEntityGhost = 0;
         }
         
         // Clear placeable item ghost
         setGhostInfo(null);
         break;
      }
   }
}

const unuseItem = (itemType: ItemType): void => {
   switch (ITEM_TYPE_RECORD[itemType]) {
      case "healing": {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
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

const onItemRightClickDown = (itemType: ItemType, itemInventoryName: InventoryName, itemSlot: number): void => {
   const transformComponent = TransformComponentArray.getComponent(Player.instance!.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);

   const attackInfo = getItemAttackInfo(itemType);
   if (attackInfo.attackTimings.blockTimeTicks !== null) {
      const limb = inventoryUseComponent.getLimbInfoByInventoryName(itemInventoryName);

      // Start blocking
      if (limb.action === LimbAction.none) {
         if (!itemIsResting(itemSlot)) {
            limb.action = LimbAction.engageBlock;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks;
            limb.currentActionRate = 1;
            
            sendStartItemUsePacket();
         }
         return;
      // Feign attack
      } else if (limb.action === LimbAction.windAttack || (limb.action === LimbAction.attack && limb.currentActionElapsedTicks <= AttackVars.FEIGN_SWING_TICKS_LEEWAY)) {
         // @Copynpaste
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const progress = secondsSinceLastAction * Settings.TPS / limb.currentActionDurationTicks;

         limb.action = LimbAction.feignAttack;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionElapsedTicks = AttackVars.FEIGN_TIME_TICKS;
         limb.currentActionRate = 1;
         limb.currentActionStartLimbState = copyCurrentLimbState(limb.currentActionStartLimbState, limb.currentActionEndLimbState, progress);
         limb.currentActionEndLimbState = TRIBESMAN_RESTING_LIMB_STATE;
      // Buffer block
      } else {
         attackBufferTime = INPUT_COYOTE_TIME;
         bufferedInputType = BufferedInputType.block;
      }
   }

   const itemCategory = ITEM_TYPE_RECORD[itemType];
   switch (itemCategory) {
      case "healing": {
         const healthComponent = HealthComponentArray.getComponent(Player.instance!.id);
         const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
         if (healthComponent.health >= maxHealth) {
            break;
         }

         const limb = inventoryUseComponent.getLimbInfoByInventoryName(itemInventoryName);
         if (limb.action === LimbAction.none) {
            const itemInfo = ITEM_INFO_RECORD[itemType] as ConsumableItemInfo;
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
               
            limb.action = action;
            limb.lastEatTicks = Board.serverTicks;

            sendStartItemUsePacket();
            // @Incomplete
            // if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            //    // @Cleanup
            //    const otherUseInfo = inventoryUseComponent.limbInfos[isOffhand ? 0 : 1];
            //    otherUseInfo.action = action;
            //    otherUseInfo.lastEatTicks = Board.serverTicks;
            // }
         }

         break;
      }
      case "crossbow": {
         if (!definiteGameState.hotbarCrossbowLoadProgressRecord.hasOwnProperty(itemSlot) || definiteGameState.hotbarCrossbowLoadProgressRecord[itemSlot]! < 1) {
            // Start loading crossbow
            const limb = inventoryUseComponent.getLimbInfoByInventoryName(itemInventoryName);
            limb.action = LimbAction.loadCrossbow;
            limb.lastCrossbowLoadTicks = Board.serverTicks;
            playSound("crossbow-load.mp3", 0.4, 1, transformComponent.position);
         } else {
            // Fire crossbow
            sendItemUsePacket();
            playSound("crossbow-fire.mp3", 0.4, 1, transformComponent.position);
         }
         break;
      }
      case "bow": {
         for (let i = 0; i < 2; i++) {
            const limb = inventoryUseComponent.getLimbInfoByInventoryName(i === 0 ? InventoryName.hotbar : InventoryName.offhand);
            limb.action = LimbAction.chargeBow;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = (ITEM_INFO_RECORD[itemType] as BowItemInfo).shotChargeTimeTicks;
            limb.currentActionRate = 1;
         }
         
         sendStartItemUsePacket();
         playSound("bow-charge.mp3", 0.4, 1, transformComponent.position);

         break;
      }
      case "spear": {
         const limb = inventoryUseComponent.getLimbInfoByInventoryName(itemInventoryName);
         if (limb.action === LimbAction.none) {
            limb.action = LimbAction.chargeSpear;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = 3 * Settings.TPS;
            limb.currentActionRate = 1;
         }
         break;
      }
      case "battleaxe": {
         // If an axe is already thrown, don't throw another
         const limb = inventoryUseComponent.getLimbInfoByInventoryName(itemInventoryName);
         if (limb.thrownBattleaxeItemID !== -1) {
            break;
         }

         limb.action = LimbAction.chargeBattleaxe;
         limb.lastBattleaxeChargeTicks = Board.serverTicks;
         break;
      }
      case "glove":
      case "armour": {
         sendItemUsePacket();
         break;
      }
      case "placeable": {
         const layer = getEntityLayer(Player.instance!.id);
         const structureType = ITEM_INFO_RECORD[itemType as PlaceableItemType].entityType;
         const placeInfo = calculateStructurePlaceInfo(transformComponent.position, transformComponent.rotation, structureType, layer.getWorldInfo());
         
         if (placeInfo.isValid) {
            const limb = inventoryUseComponent.getLimbInfoByInventoryName(itemInventoryName);
            limb.lastAttackTicks = Board.serverTicks;

            sendItemUsePacket();
         }

         break;
      }
   }
}

const onItemRightClickUp = (item: Item, inventoryName: InventoryName): void => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
   const limb = inventoryUseComponent.getLimbInfoByInventoryName(inventoryName);

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "healing": {
         // Stop healing
         if (limb.action === LimbAction.eat) {
            unuseItem(item.type);
         }
         break;
      }
      case "spear": {
         if (limb.action === LimbAction.chargeSpear) {
            const chargeTime = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
            
            limb.action = LimbAction.none;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = 0;
            
            if (chargeTime >= 1) {
               sendItemUsePacket();
            } else {
               sendStopItemUsePacket();
               playSound("error.mp3", 0.4, 1, Camera.position);
            }
         }
         break;
      }
      case "battleaxe":
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

         for (let i = 0; i < 2; i++) {
            const limb = inventoryUseComponent.getLimbInfoByInventoryName(i === 0 ? InventoryName.hotbar : InventoryName.offhand);
            limb.action = LimbAction.none;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = 0;
         }
         
         sendItemUsePacket();
         // @Incomplete: Don't play if bow didn't actually fire an arrow
         playBowFireSound(Player.instance!.id, item.type);

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
   
   const previousItem = hotbarInventory.itemSlots[hotbarSelectedItemSlot];

   hotbarSelectedItemSlot = itemSlot;
   Hotbar_setHotbarSelectedItemSlot(itemSlot);

   // Clear any buffered inputs
   attackBufferTime = 0;

   // Deselect the previous item and select the new item
   if (typeof previousItem !== "undefined") {
      deselectItem(previousItem, false);
   }
   const newItem = hotbarInventory.itemSlots[itemSlot];
   if (typeof newItem !== "undefined") {
      selectItem(newItem);
      if (rightMouseButtonIsPressed) {
         onItemRightClickDown(newItem.type, InventoryName.hotbar, itemSlot);
      }
   }

   const playerInventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance.id);
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

         const layer = getEntityLayer(Player.instance!.id);
         const playerTransformComponent = TransformComponentArray.getComponent(Player.instance!.id);
         const structureType = ITEM_INFO_RECORD[itemType as PlaceableItemType].entityType;
         const placeInfo = calculateStructurePlaceInfo(Camera.position, playerTransformComponent.rotation, structureType, layer.getWorldInfo());

         // @Speed: should only run when the player position or rotation changes
         if (placeableEntityGhost !== 0) {
            const transformComponent = TransformComponentArray.getComponent(placeableEntityGhost);
            transformComponent.position.x = placeInfo.position.x;
            transformComponent.position.y = placeInfo.position.y;
            transformComponent.rotation = placeInfo.rotation;

            // @Speed @Garbage: only do when hitboxes change!

            // @Hack: only works if hitboxes aren't added or removed
            for (let i = 0; i < placeInfo.hitboxes.length; i++) {
               const hitboxData = placeInfo.hitboxes[i];
               const entityHitbox = transformComponent.hitboxes[i];
               entityHitbox.box.offset.x = hitboxData.box.offset.x;
               entityHitbox.box.offset.y = hitboxData.box.offset.y;
            }

            updateEntityPosition(transformComponent, placeableEntityGhost);
            
            registerDirtyEntity(placeableEntityGhost);
         }
         
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

const GameInteractableLayer = (props: GameInteractableLayerProps) => {
   const [_, forceUpdate] = useReducer(x => x + 1, 0);
   
   const [mouseX, setMouseX] = useState(0);
   const [mouseY, setMouseY] = useState(0);
   const [hotbarChargeElapsedTicks, setHotbarChargeElapsedTicks] = useState(-1);
   const [hotbarChargeDuration, setHotbarChargeDuration] = useState(-1);
   const [offhandChargeElapsedTicks, setOffhandChargeElapsedTicks] = useState(-1);
   const [offhandChargeDuration, setOffhandChargeDuration] = useState(-1);

   const hotbarItemRestTimes = useRef(createItemRestTimes(Settings.INITIAL_PLAYER_HOTBAR_SIZE));
   const offhandItemRestTimes = useRef(createItemRestTimes(1));
   
   useEffect(() => {
      // @Hack
      GameInteractableLayer_setChargeInfo = (inventoryName: InventoryName, elapsedTicks: number, duration: number): void => {
         switch (inventoryName) {
            case InventoryName.hotbar: {
               setHotbarChargeElapsedTicks(elapsedTicks);
               setHotbarChargeDuration(duration);
               break;
            }
            case InventoryName.offhand: {
               setOffhandChargeElapsedTicks(elapsedTicks);
               setOffhandChargeDuration(duration);
               break;
            }
         }
      }

      // @Hack
      GameInteractableLayer_setItemRestTime = (inventoryName: InventoryName, itemSlot: number, restTimeTicks: number): void => {
         const itemSlotIdx = itemSlot - 1;
         switch (inventoryName) {
            case InventoryName.hotbar: {
               hotbarItemRestTimes.current[itemSlotIdx].durationTicks = restTimeTicks;
               hotbarItemRestTimes.current[itemSlotIdx].remainingTimeTicks = restTimeTicks;
               forceUpdate();
               break;
            }
            case InventoryName.offhand: {
               offhandItemRestTimes.current[itemSlotIdx].durationTicks = restTimeTicks;
               offhandItemRestTimes.current[itemSlotIdx].remainingTimeTicks = restTimeTicks;
               forceUpdate();
               break;
            }
         }
      }

      // @Hack
      GameInteractableLayer_update = () => {
         for (let i = 0; i < hotbarItemRestTimes.current.length; i++) {
            const restTime = hotbarItemRestTimes.current[i];
            if (restTime.remainingTimeTicks > 0) {
               restTime.remainingTimeTicks--;
            }
         }


         const restTime = offhandItemRestTimes.current[0];
         if (restTime.remainingTimeTicks > 0) {
            restTime.remainingTimeTicks--;
         }
         
         forceUpdate();
      }

      GameInteractableLayer_getHotbarRestTimes = () => {
         return hotbarItemRestTimes.current;
      }
   }, []);
   
   const onMouseMove = useCallback((e: React.MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
   }, []);

   const onContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
   }, []);

   return <>
      <div id="game-interactable-layer" draggable={false} onMouseMove={onMouseMove} onMouseDown={onGameMouseDown} onMouseUp={onGameMouseUp} onContextMenu={onContextMenu}></div>
      
      <AttackChargeBar mouseX={mouseX} mouseY={mouseY} chargeElapsedTicks={hotbarChargeElapsedTicks} chargeDuration={hotbarChargeDuration} />
      <AttackChargeBar mouseX={mouseX} mouseY={mouseY + 18} chargeElapsedTicks={offhandChargeElapsedTicks} chargeDuration={offhandChargeDuration} />

      {!props.cinematicModeIsEnabled ? (
         <Hotbar hotbarItemRestTimes={hotbarItemRestTimes.current} offhandItemRestTimes={offhandItemRestTimes.current} />
      ) : undefined}
   </>
}

export default GameInteractableLayer;