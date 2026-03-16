import { assert, Point, TribeType, TRIBE_INFO_RECORD, TribesmanTitle, STATUS_EFFECT_MODIFIERS, Settings, ARROW_RELEASE_WAIT_TIME_TICKS, BowItemInfo, ConsumableItemCategory, ConsumableItemInfo, getItemAttackInfo, InventoryName, Item, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType, PlaceableItemInfo, PlaceableItemType, QUIVER_ACCESS_TIME_TICKS, QUIVER_PULL_TIME_TICKS, RETURN_FROM_BOW_USE_TIME_TICKS, Entity, LimbAction, ServerComponentType, BuildingMaterial, AttackVars, BLOCKING_LIMB_STATE, copyLimbState, interpolateLimbState, LimbConfiguration, LimbState, QUIVER_PULL_LIMB_STATE, RESTING_LIMB_STATES, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BLOCKING_LIMB_STATE, polarVec2, lerp } from "webgl-test-shared";
import { entitySelectionState } from "../ui-state/entity-selection-state";
import { GameInteractState, gameUIState } from "../ui-state/game-ui-state";
import { Menu, menuSelectorState } from "../ui-state/menu-selector-state";
import { playerActionState } from "../ui-state/player-action-state";
import { currentSnapshot, gameIsRunning, getElapsedTimeInSeconds } from "./game";
import { getEntityClientComponentConfigs } from "./entity-components/client-components";
import { createBarrelComponentData } from "./entity-components/server-components/BarrelComponent";
import { createBracingsComponentData } from "./entity-components/server-components/BracingsComponent";
import { createBuildingMaterialComponentData } from "./entity-components/server-components/BuildingMaterialComponent";
import { createCampfireComponentData } from "./entity-components/server-components/CampfireComponent";
import { createCookingComponentData } from "./entity-components/server-components/CookingComponent";
import { createFireTorchComponentData } from "./entity-components/server-components/FireTorchComponent";
import { createFurnaceComponentData } from "./entity-components/server-components/FurnaceComponent";
import { HealthComponentArray, createHealthComponentData } from "./entity-components/server-components/HealthComponent";
import { InventoryComponentArray, getInventory, updatePlayerHeldItem, createInventoryComponentData } from "./entity-components/server-components/InventoryComponent";
import { InventoryUseComponentArray, getLimbByInventoryName, LimbInfo, getLimbConfiguration, getCurrentLimbState, getPlayerLimbHitbox } from "./entity-components/server-components/InventoryUseComponent";
import { createResearchBenchComponentData } from "./entity-components/server-components/ResearchBenchComponent";
import { createSlurbTorchComponentData } from "./entity-components/server-components/SlurbTorchComponent";
import { createSpikesComponentData } from "./entity-components/server-components/SpikesComponent";
import { StatusEffectComponentArray, createStatusEffectComponentData } from "./entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "./entity-components/server-components/StructureComponent";
import { TransformComponentArray, createTransformComponentData } from "./entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "./entity-components/server-components/TribeComponent";
import { getHumanoidRadius, TribesmanComponentArray, tribesmanHasTitle } from "./entity-components/server-components/TribesmanComponent";
import { attemptEntitySelection } from "./entity-selection";
import { EntityRenderInfo } from "./EntityRenderInfo";
import { getHitboxVelocity, applyAccelerationFromGround, Hitbox, setHitboxRelativeAngle } from "./hitboxes";
import { countItemTypesInInventory } from "./inventory-manipulation";
import { addKeyListener, keyIsPressed } from "./keyboard-input";
import { sendStopItemUsePacket, sendAttackPacket, sendItemDropPacket, sendDismountCarrySlotPacket, sendStartItemUsePacket, sendItemUsePacket, sendSelectRiderDepositLocationPacket, sendSetMoveTargetPositionPacket, sendSpectateEntityPacket, sendAscendPacket } from "./networking/packet-sending/packet-sending";
import { AnimalStaffCommandType, createControlCommandParticles } from "./particles";
import { playerInstance, isSpectating } from "./player";
import { thingIsVisualRenderPart } from "./render-parts/render-parts";
import { removeGhostRenderInfo, addGhostRenderInfo } from "./rendering/webgl/entity-ghost-rendering";
import { attemptToCompleteNode } from "./research";
import { playHeadSound, playSoundOnHitbox } from "./sound";
import { calculateEntityPlaceInfo } from "./structure-placement";
import { playerTribe } from "./tribes";
import { entityExists, getEntityLayer, getCurrentLayer, EntityComponentData, createEntityCreationInfo } from "./world";
import { cursorWorldPos, setCameraVelocity } from "./camera";
import { HeldItemComponentArray } from "./entity-components/server-components/HeldItemComponent";
import { ServerComponentData } from "./entity-components/components";
import { getEntityServerComponentTypes, getServerComponentData } from "./entity-component-types";
import { hotbarFuncs } from "../ui-state/hotbar-funcs";

export interface ItemRestTime {
   remainingTimeTicks: number;
   durationTicks: number;
   itemSlot: number;
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

/** Time in seconds that attack/block inputs will be buffered */
// @SQUEAM: reduce to 0.08
const INPUT_COYOTE_TIME = 0.1;

/** Acceleration of the player while moving without any modifiers. */
const PLAYER_ACCELERATION = 600;

const PLAYER_LIGHTSPEED_ACCELERATION = 15000;

/** Acceleration of the player while slowed. */
const PLAYER_SLOW_ACCELERATION = 350;

/** Acceleration of the player for a brief period after being hit */
const PLAYER_DISCOMBOBULATED_ACCELERATION = 275;

let spectatorSpeed = 800;

export let rightMouseButtonIsPressed = false;

let hotbarSelectedItemSlot = 1;

   /** Whether the inventory is open or not. */
let _inventoryIsOpen = false;

let discombobulationTimer = 0;

/** If > 0, it counts down the remaining time that the attack is buffered. */
let attackBufferTime = 0;
let bufferedInputType = BufferedInputType.attack;
let bufferedInputInventory = InventoryName.hotbar;

let placeableEntityGhostRenderInfo: EntityRenderInfo | null = null;

const hotbarCrossbowLoadProgressRecord: Partial<Record<number, number>> = {};

// @HACk
let carrier: Entity = 0;
export function setShittyCarrier(entity: Entity): void {
   carrier = entity;
}

let playerMoveIntention = -999;

export function getPlayerMoveIntention(): number {
   return playerMoveIntention;
}

export function getSpectatorSpeed(): number {
   return spectatorSpeed;
}
export function setSpectatorSpeed(speed: number): void {
   spectatorSpeed = speed;
}

// @Copynpaste
const BOW_HOLDING_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 36,
   angle: -Math.PI * 0.4,
   extraOffsetX: 4,
   extraOffsetY: 0
};
const BOW_DRAWING_CHARGE_START_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 0,
   angle: 0,
   extraOffsetX: 0,
   extraOffsetY: 22
};
const BOW_DRAWING_CHARGE_END_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 0,
   angle: 0,
   extraOffsetX: 0,
   extraOffsetY: 8
};

addKeyListener(" ", () => {
   // Ascend layers
   if (gameIsRunning && gameUIState.canAscendLayer) {
      sendAscendPacket();
   }
});

export function getHotbarSelectedItemSlot(): number {
   return hotbarSelectedItemSlot;
}

export function getInstancePlayerAction(inventoryName: InventoryName): LimbAction {
   if (playerInstance === null) {
      return LimbAction.none;
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);
   
   const limbInfo = getLimbByInventoryName(inventoryUseComponent, inventoryName);
   return limbInfo.action;
}

export function playerIsHoldingPlaceableItem(): boolean {
   if (playerInstance === null) {
      return false;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);

   const hotbarLimb = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
   if (hotbarLimb.heldItemType !== null && ITEM_TYPE_RECORD[hotbarLimb.heldItemType] === "placeable") {
      return true;
   }

   const offhandLimb = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
   if (offhandLimb.heldItemType !== null && ITEM_TYPE_RECORD[offhandLimb.heldItemType] === "placeable") {
      return true;
   }

   return false;
}

/** Distract blind target. Now, discombobulate. */
export function discombobulate(discombobulationTimeSeconds: number): void {
   if (discombobulationTimeSeconds > discombobulationTimer) {
      discombobulationTimer = discombobulationTimeSeconds;
   }
}

const itemIsResting = (inventoryName: InventoryName): boolean => {
   const restTime = inventoryName === InventoryName.hotbar ? playerActionState.hotbarItemRestTime : playerActionState.offhandItemRestTime;
   return restTime.remainingTimeTicks > 0;
}

export function cancelAttack(limb: LimbInfo, limbConfiguration: LimbConfiguration): void {
   const attackInfo = getItemAttackInfo(limb.heldItemType);

   limb.action = LimbAction.returnAttackToRest;
   limb.currentActionElapsedTicks = 0;
   limb.currentActionDurationTicks = attackInfo.attackTimings.returnTimeTicks * getAttackTimeMultiplier(limb.heldItemType);

   limb.currentActionStartLimbState = limb.currentActionEndLimbState;
   // @Speed: Garbage collection
   limb.currentActionEndLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
}

const getLimbStateOffset = (limb: LimbState, humanoidRadius: number): Point => {
   const offset = limb.extraOffset + humanoidRadius + 2;

   const offsetX = offset * Math.sin(limb.direction) + limb.extraOffsetX;
   const offsetY = offset * Math.cos(limb.direction) + limb.extraOffsetY;
   return new Point(offsetX, offsetY);
}

const updateHandHitboxToLimbInfo = (limb: LimbInfo): void => {
   const handHitbox = getPlayerLimbHitbox(limb);
   
   const limbOffset = getLimbStateOffset(getCurrentLimbState(limb), getHumanoidRadius(playerInstance!));
   handHitbox.box.offset.x = limbOffset.x;
   handHitbox.box.offset.y = limbOffset.y;

   const progress = limb.currentActionDurationTicks > 0 ? limb.currentActionElapsedTicks / limb.currentActionDurationTicks : 1;
   setHitboxRelativeAngle(handHitbox, lerp(limb.currentActionStartLimbState.angle, limb.currentActionEndLimbState.angle, progress));
}

// @Cleanup: bad name. mostly updating limbs
export function tickPlayerItems(): void {
   if (playerInstance === null) {
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);

   discombobulationTimer -= Settings.DT_S;
   if (discombobulationTimer < 0) {
      discombobulationTimer = 0;
   }

   // @Cleanup: Copynpaste for the action completion all over here. solution: make currentActionIsFinished method on Limb class

   for (let i = 0; i < 2; i++) {
      const inventoryName = i === 0 ? InventoryName.hotbar : InventoryName.offhand;
      const selectedItemSlot = i === 0 ? hotbarSelectedItemSlot : 1;
      
      const limb = getLimbByInventoryName(inventoryUseComponent, inventoryName);

      if (limb.currentActionPauseTicksRemaining > 0) {
         limb.currentActionPauseTicksRemaining--;
      } else {
         limb.currentActionElapsedTicks += limb.currentActionRate;
      }

      // If the item is resting, the player isn't able to use it
      if (limb.action === LimbAction.block && itemIsResting(inventoryName)) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);
         
         // @Copynpaste

         const initialLimbState = getCurrentLimbState(limb);

         limb.action = LimbAction.returnBlockToRest;
         limb.currentActionElapsedTicks = 0;
         // @Temporary? Perhaps use separate blockReturnTimeTicks.
         limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks!;
         // The shield did a block, so it returns to rest twice as fast
         limb.currentActionRate = 2;
         limb.currentActionStartLimbState = copyLimbState(initialLimbState);
         limb.currentActionEndLimbState = RESTING_LIMB_STATES[getLimbConfiguration(inventoryUseComponent)];

         sendStopItemUsePacket();
      }
      
      // If finished winding attack, switch to doing attack
      if (limb.action === LimbAction.windAttack && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         const attackInfo = getItemAttackInfo(limb.heldItemType);

         const attackPattern = attackInfo.attackPatterns![getLimbConfiguration(inventoryUseComponent)];
         
         limb.action = LimbAction.attack;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = attackInfo.attackTimings.swingTimeTicks * getAttackTimeMultiplier(limb.heldItemType);

         // @Speed: Garbage collection
         limb.currentActionStartLimbState = copyLimbState(attackPattern.windedBack);
         // @Speed: Garbage collection
         limb.currentActionEndLimbState = copyLimbState(attackPattern.swung);

         const transformComponent = TransformComponentArray.getComponent(playerInstance);
         const playerHitbox = transformComponent.hitboxes[0];
         const playerVelocity = getHitboxVelocity(playerHitbox);

         // Add extra range for moving attacks
         const velocityMagnitude = playerVelocity.magnitude();
         if (velocityMagnitude > 0) {
            const attackAlignment = (playerVelocity.x * Math.sin(playerHitbox.box.angle) + playerVelocity.y * Math.cos(playerHitbox.box.angle)) / velocityMagnitude;
            if (attackAlignment > 0) {
               const extraAmount = AttackVars.MAX_EXTRA_ATTACK_RANGE * Math.min(velocityMagnitude / AttackVars.MAX_EXTRA_ATTACK_RANGE_SPEED);
               limb.currentActionEndLimbState.extraOffsetY += extraAmount;
            }
         }
      }

      // If finished attacking, go to rest
      if (limb.action === LimbAction.attack && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         cancelAttack(limb, getLimbConfiguration(inventoryUseComponent));
      }

      // If finished moving limb to quiver, move from quiver to charge start limbstate
      if (limb.action === LimbAction.moveLimbToQuiver && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         const startLimbState = getCurrentLimbState(limb);
         
         limb.action = LimbAction.moveLimbFromQuiver;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = QUIVER_PULL_TIME_TICKS;
         limb.currentActionStartLimbState = startLimbState;
         limb.currentActionEndLimbState = BOW_DRAWING_CHARGE_START_LIMB_STATE;

         playHeadSound("quiver-pull.mp3", 0.4, 1);
      }

      // if finished moving limb from quiver, start charging bow
      if (limb.action === LimbAction.moveLimbFromQuiver && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         const startLimbState = getCurrentLimbState(limb);
         // @Hack
         const itemInfo = ITEM_INFO_RECORD[ItemType.wooden_bow] as BowItemInfo;
         
         limb.action = LimbAction.pullBackArrow;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = itemInfo.shotChargeTimeTicks;
         limb.currentActionStartLimbState = startLimbState;
         limb.currentActionEndLimbState = BOW_DRAWING_CHARGE_END_LIMB_STATE;
         
         const otherInventoryName = i === 0 ? InventoryName.offhand : InventoryName.hotbar;
         const otherLimb = getLimbByInventoryName(inventoryUseComponent, otherInventoryName);
         const otherLimbStartState = getCurrentLimbState(otherLimb);
         
         otherLimb.action = LimbAction.chargeBow;
         otherLimb.currentActionElapsedTicks = 0;
         otherLimb.currentActionDurationTicks = itemInfo.shotChargeTimeTicks;
         // Don't move the limb
         otherLimb.currentActionStartLimbState = otherLimbStartState;
         otherLimb.currentActionEndLimbState = otherLimbStartState;

         playHeadSound("bow-charge.mp3", 0.4, 1);
      }

      // If finished resting after arrow release, return to default state
      if ((limb.action === LimbAction.arrowReleased || limb.action === LimbAction.mainArrowReleased) && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         const initialLimbState = getCurrentLimbState(limb);
         const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
         
         limb.action = LimbAction.returnFromBow;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = RETURN_FROM_BOW_USE_TIME_TICKS;
         // @Speed: why are we copying?
         limb.currentActionStartLimbState = copyLimbState(initialLimbState);
         limb.currentActionEndLimbState = RESTING_LIMB_STATES[limbConfiguration];
      }

      if (limb.action === LimbAction.returnFromBow && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         const initialLimbState = getCurrentLimbState(limb);
         const limbConfiguration = getLimbConfiguration(inventoryUseComponent);

         limb.action = LimbAction.none;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;
         // @Speed: why are we copying?
         limb.currentActionStartLimbState = copyLimbState(initialLimbState);
         limb.currentActionEndLimbState = RESTING_LIMB_STATES[limbConfiguration];
      }

      // If finished going to rest, set to default
      if (limb.action === LimbAction.returnAttackToRest && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         const initialLimbState = getCurrentLimbState(limb);
         const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
         
         const attackInfo = getItemAttackInfo(limb.heldItemType);
         
         limb.action = LimbAction.none;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = attackInfo.attackTimings.restTimeTicks;
         // @Speed: why are we copying?
         limb.currentActionStartLimbState = copyLimbState(initialLimbState);
         limb.currentActionEndLimbState = RESTING_LIMB_STATES[limbConfiguration];
      }

      // If finished engaging block, go to block
      if (limb.action === LimbAction.engageBlock && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.block;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;

         
      // case LimbAction.block: {
      //    // @Copynpaste
      //    const state = heldItemType !== null && ITEM_TYPE_RECORD[heldItemType] === "shield" ? SHIELD_BLOCKING_LIMB_STATE : BLOCKING_LIMB_STATE
      //    setThingToState(getHumanoidRadius(entity), attachPoint, state);
      //    resetThing(limbRenderPart);
      //    updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
      //    removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
      //    break;
      // }
      }

      // @Incomplete: Double-check there isn't a tick immediately after depressing the button where this hasn't registered in the limb yet
      // If blocking but not right clicking, return to rest
      if (limb.action === LimbAction.block && !rightMouseButtonIsPressed) {
         const heldItemComponent = HeldItemComponentArray.getComponent(limb.heldItemEntity);
         const hasBlocked = heldItemComponent.hasBlocked;

         const initialLimbState = getCurrentLimbState(limb);

         const attackInfo = getItemAttackInfo(limb.heldItemType);
         limb.action = LimbAction.returnBlockToRest;
         limb.currentActionElapsedTicks = 0;
         // @Temporary? Perhaps use separate blockReturnTimeTicks.
         limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks!;
         limb.currentActionRate = hasBlocked ? 2 : 1;
         // @Speed: why copy?
         limb.currentActionStartLimbState = copyLimbState(initialLimbState);
         limb.currentActionEndLimbState = RESTING_LIMB_STATES[getLimbConfiguration(inventoryUseComponent)];

         sendStopItemUsePacket();
      }

      // @Copynpaste
      // If finished returning block to rest, go to rest
      if (limb.action === LimbAction.returnBlockToRest && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.none;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;
      }

      // If finished feigning attack, go to rest
      if (limb.action === LimbAction.feignAttack && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.none;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = 0;
      }

      if (limb.action === LimbAction.windShieldBash && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.pushShieldBash;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_PUSH_TIME_TICKS;
      }

      if (limb.action === LimbAction.pushShieldBash && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
         limb.action = LimbAction.returnShieldBashToRest;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_RETURN_TIME_TICKS;
      }

      if (limb.action === LimbAction.returnShieldBashToRest && getElapsedTimeInSeconds(limb.currentActionElapsedTicks) * Settings.TICK_RATE >= limb.currentActionDurationTicks) {
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
                  onItemStartUse(limb.heldItemType, inventoryName, selectedItemSlot);
               }
               break;
            }
         }
         
         attackBufferTime -= Settings.DT_S;
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
      
      switch (inventoryName) {
         case InventoryName.hotbar: {
            playerActionState.setHotbarChargeElapsedTicks(attackElapsedTicks);
            playerActionState.setHotbarChargeDuration(attackDuration);
            break;
         }
         case InventoryName.offhand: {
            playerActionState.setOffhandChargeElapsedTicks(attackElapsedTicks);
            playerActionState.setOffhandChargeDuration(attackDuration);
            break;
         }
      }
   
      // Tick held item
      if (limb.heldItemType !== null) {
         tickItem(limb.heldItemType);
      }

      updateHandHitboxToLimbInfo(limb);
   }

   playerActionState.decreaseItemRestTimes();
}

const tryToSwing = (inventoryName: InventoryName): boolean => {
   if (playerInstance === null) {
      return false;
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);

   const limb = getLimbByInventoryName(inventoryUseComponent, inventoryName);
   const attackInfo = getItemAttackInfo(limb.heldItemType);

   // Shield-bash
   if (attackInfo.attackPatterns === null) {
      if (limb.action === LimbAction.block) {
         limb.action = LimbAction.windShieldBash;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_WINDUP_TIME_TICKS;
         limb.currentActionRate = 1;

         // @Speed: Garbage collection
         limb.currentActionStartLimbState = copyLimbState(SHIELD_BLOCKING_LIMB_STATE);
         // @Speed: Garbage collection
         limb.currentActionEndLimbState = copyLimbState(SHIELD_BASH_WIND_UP_LIMB_STATE);

         const transformComponent = TransformComponentArray.getComponent(playerInstance);
         const playerHitbox = transformComponent.hitboxes[0];
         sendAttackPacket(hotbarSelectedItemSlot, playerHitbox.box.angle);
      }
      return false;
   }

   if (limb.action !== LimbAction.none || limb.currentActionElapsedTicks < limb.currentActionDurationTicks) {
      return false;
   }

   const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
   const attackPattern = attackInfo.attackPatterns[limbConfiguration];

   limb.action = LimbAction.windAttack;
   limb.currentActionElapsedTicks = 0;
   limb.currentActionDurationTicks = attackInfo.attackTimings.windupTimeTicks * getAttackTimeMultiplier(limb.heldItemType);
   limb.currentActionRate = 1;

   // @Speed: Garbage collection
   limb.currentActionStartLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
   // @Speed: Garbage collection
   limb.currentActionEndLimbState = copyLimbState(attackPattern.windedBack);

   sendAttackPacket(hotbarSelectedItemSlot);

   return true;
}

// @Cleanup: unused?
const getAttackTimeMultiplier = (itemType: ItemType | null): number => {
   let swingTimeMultiplier = 1;

   if (playerTribe.tribeType === TribeType.barbarians) {
      // 30% slower
      swingTimeMultiplier /= 0.7;
   }

   // Builders swing hammers 30% faster
   const tribesmanComponent = TribesmanComponentArray.getComponent(playerInstance!);
   if (tribesmanHasTitle(tribesmanComponent, TribesmanTitle.builder) && itemType !== null && ITEM_TYPE_RECORD[itemType] === "hammer") {
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
   if (playerInstance === null) return;

   let attackDidSucceed = tryToSwing(InventoryName.hotbar);
   if (!attackDidSucceed && playerTribe.tribeType === TribeType.barbarians) {
      attackDidSucceed = tryToSwing(InventoryName.offhand);
   }

   if (!attackDidSucceed) {
      attackBufferTime = INPUT_COYOTE_TIME;
      bufferedInputType = BufferedInputType.attack;
      bufferedInputInventory = InventoryName.hotbar;
   }
}

export function getPlayerSelectedItem(): Item | null {
   if (playerInstance === null) {
      return null;
   }
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar)!;
   return hotbarInventory.getItem(hotbarSelectedItemSlot);
}

/** Gets the selected item slot for an arbitrary inventory */
export function getPlayerSelectedItemSlot(inventoryName: InventoryName): number | null {
   switch (inventoryName) {
      case InventoryName.hotbar: {
         return hotbarSelectedItemSlot;
      }
      case InventoryName.offhand: {
         return 1;
      }
      default: {
         return null;
      }
   }
}

export function getSelectedItemInfo(): SelectedItemInfo | null {
   if (playerInstance === null) {
      return null;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar)!;
   
   const heldItem = hotbarInventory.getItem(hotbarSelectedItemSlot);
   if (heldItem !== null) {
      return {
         item: heldItem,
         itemSlot: hotbarSelectedItemSlot,
         inventoryName: InventoryName.hotbar
      };
   }

   const offhand = getInventory(inventoryComponent, InventoryName.offhand)!;
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

const createHotbarKeyListeners = (): void => {
   for (let itemSlot = 1; itemSlot <= Settings.INITIAL_PLAYER_HOTBAR_SIZE; itemSlot++) {
      addKeyListener(itemSlot.toString(), () => { selectItemSlot(itemSlot); });
   }
   addKeyListener("!", () => { selectItemSlot(1); });
   addKeyListener("@", () => { selectItemSlot(2); });
   addKeyListener("#", () => { selectItemSlot(3); });
   addKeyListener("$", () => { selectItemSlot(4); });
   addKeyListener("%", () => { selectItemSlot(5); });
   addKeyListener("^", () => { selectItemSlot(6); });
   addKeyListener("&", () => { selectItemSlot(7); });
}

const hideInventory = (): void => {
   _inventoryIsOpen = false;
   
   menuSelectorState.closeCurrentMenu();

   // If the player is holding an item when their inventory is closed, throw the item out
   if (playerInstance !== null) {
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
      const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
      if (heldItemInventory.hasItem(1)) {
         const transformComponent = TransformComponentArray.getComponent(playerInstance);
         const playerHitbox = transformComponent.hitboxes[0];
         sendItemDropPacket(InventoryName.heldItemSlot, 1, 99999, playerHitbox.box.angle);
      }
   }
}
 
/** Creates the key listener to toggle the inventory on and off. */
const createInventoryToggleListeners = (): void => {
   addKeyListener("e", () => {
      const didCloseMenu = menuSelectorState.closeCurrentMenu();
      if (!didCloseMenu) {
         // Open the crafting menu
         menuSelectorState.openMenu(Menu.craftingMenu);
      }
   });

   addKeyListener("i", () => {
      if (_inventoryIsOpen) {
         hideInventory();
         return;
      }
   });
   addKeyListener("escape", () => {
      menuSelectorState.closeCurrentMenu();
   });
}

/** Creates keyboard and mouse listeners for the player. */
export function createPlayerInputListeners(): void {
   createHotbarKeyListeners();
   createInventoryToggleListeners();

   document.body.addEventListener("wheel", e => {
      // Don't scroll hotbar if element is being scrolled instead
      const elemPath = e.composedPath() as Array<HTMLElement>;
      for (const elem of elemPath) {
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
      if (playerInstance !== null) {
         const selectedItemInfo = getSelectedItemInfo();
         if (selectedItemInfo === null) {
            return;
         }

         const playerTransformComponent = TransformComponentArray.getComponent(playerInstance);
         const playerHitbox = playerTransformComponent.hitboxes[0];
         
         const dropAmount = keyIsPressed("shift") ? 99999 : 1;
         sendItemDropPacket(selectedItemInfo.inventoryName, hotbarSelectedItemSlot, dropAmount, playerHitbox.box.angle);
      }
   });

   addKeyListener("shift", () => {
      // Don't want to dismount the player's mount when they're shift clicking an item in an inventory!
      if (menuSelectorState.hasOpenNonEmbodiedMenu()) {
         return;
      }
      
      if (playerInstance !== null) {
         const transformComponent = TransformComponentArray.getComponent(playerInstance);
         const playerHitbox = transformComponent.hitboxes[0];
         if (playerHitbox.parent !== null && entityExists(playerHitbox.parent.entity)) {
            sendDismountCarrySlotPacket();
         }
      }
   });
}

export function onGameMouseDown(e: MouseEvent): void {
   if (e.button === 0) { // Left click
      if (gameUIState.gameInteractState === GameInteractState.spectateEntity) {
         const hoveredEntity = entitySelectionState.hoveredEntity;
         if (hoveredEntity !== null) {
            sendSpectateEntityPacket(hoveredEntity);
            gameUIState.setGameInteractState(GameInteractState.none);
         }
      } else if (gameUIState.gameInteractState === GameInteractState.selectCarryTarget || gameUIState.gameInteractState === GameInteractState.selectAttackTarget) {
         const didSelectEntity = attemptEntitySelection();
         if (didSelectEntity) {
            e.preventDefault();
         }
      } else if (gameUIState.gameInteractState === GameInteractState.selectRiderDepositLocation) {
         const selectedEntity = entitySelectionState.selectedEntity;
         if (selectedEntity !== null) {
            sendSelectRiderDepositLocationPacket(selectedEntity, cursorWorldPos);
            entitySelectionState.setSelectedEntity(null);
            gameUIState.setGameInteractState(GameInteractState.none);
         }
      } else {
         attemptAttack();
      }
   } else if (e.button === 2) { // Right click
      rightMouseButtonIsPressed = true;

      if (gameUIState.gameInteractState === GameInteractState.selectCarryTarget || gameUIState.gameInteractState === GameInteractState.selectAttackTarget) {
         gameUIState.setGameInteractState(GameInteractState.none);
         return;
      }

      if (gameUIState.gameInteractState === GameInteractState.selectMoveTargetPosition) {
         const selectedEntity = entitySelectionState.selectedEntity;
         if (selectedEntity !== null) {
            sendSetMoveTargetPositionPacket(selectedEntity, cursorWorldPos.x, cursorWorldPos.y);
            gameUIState.setGameInteractState(GameInteractState.none);
            createControlCommandParticles(AnimalStaffCommandType.move);
         }
         return;
      }
      
      const didSelectEntity = attemptEntitySelection();
      if (didSelectEntity) {
         e.preventDefault();
      } else {
         const selectedItemInfo = getSelectedItemInfo();
         if (selectedItemInfo !== null) {
            onItemStartUse(selectedItemInfo.item.type, selectedItemInfo.inventoryName, selectedItemInfo.itemSlot);
   
            // Special case: Barbarians can eat with both hands at once
            if (playerInstance !== null && selectedItemInfo.inventoryName === InventoryName.hotbar && ITEM_TYPE_RECORD[selectedItemInfo.item.type] === "healing") {
               const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
               const offhandInventory = getInventory(inventoryComponent, InventoryName.offhand)!;
               const offhandHeldItem = offhandInventory.getItem(1);
               if (offhandHeldItem !== null) {
                  onItemStartUse(offhandHeldItem.type, InventoryName.offhand, 1);
               }
            }
         }
      }
      
      attemptToCompleteNode();
   }
}

export function onGameMouseUp(e: MouseEvent): void {
   if (playerInstance === null) return;

   if (e.button === 0) { // Left click
   } else if (e.button === 2) { // Right click
      rightMouseButtonIsPressed = false;

      const selectedItemInfo = getSelectedItemInfo();
      if (selectedItemInfo !== null) {
         onItemEndUse(selectedItemInfo.item, selectedItemInfo.inventoryName);
      }
   }
}

const isCollidingWithCoveredSpikes = (): boolean => {
   // @Incomplete
   return false;
   
   // const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   
   // for (let i = 0; i < transformComponent.collidingEntities.length; i++) {
   //    const entity = transformComponent.collidingEntities[i];

   //    if (SpikesComponentArray.hasComponent(entity.id)) {
   //       const spikesComponent = SpikesComponentArray.getComponent(entity.id);
   //       if (spikesComponent.isCovered) {
   //          return true;
   //       }
   //    }
   // }

   // return false;
}

const getPlayerMoveSpeedMultiplier = (moveDirection: number): number => {
   if (playerInstance === null) {
      return 1;
   }
   
   let moveSpeedMultiplier = 1;
   
   const statusEffectComponent = StatusEffectComponentArray.getComponent(playerInstance);
   for (const statusEffect of statusEffectComponent.statusEffects) {
      moveSpeedMultiplier *= STATUS_EFFECT_MODIFIERS[statusEffect.type].moveSpeedMultiplier;
   }

   moveSpeedMultiplier *= TRIBE_INFO_RECORD[playerTribe.tribeType].moveSpeedMultiplier;

   const tribesmanComponent = TribesmanComponentArray.getComponent(playerInstance);
   if (tribesmanHasTitle(tribesmanComponent, TribesmanTitle.sprinter)) {
      moveSpeedMultiplier *= 1.2;
   }

   if (isCollidingWithCoveredSpikes()) {
      moveSpeedMultiplier *= 0.5;
   }

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const playerHitbox = transformComponent.hitboxes[0];
   // Get how aligned the intended movement direction and the player's rotation are
   const directionAlignmentDot = Math.sin(moveDirection) * Math.sin(playerHitbox.box.angle) + Math.cos(moveDirection) * Math.cos(playerHitbox.box.angle);
   // Move 15% slower if you're accelerating away from where you're moving
   if (directionAlignmentDot < 0) {
      const reductionMultiplier = -directionAlignmentDot;
      moveSpeedMultiplier *= 1 - 0.15 * reductionMultiplier;
   }

   return moveSpeedMultiplier;
}

const updateSpectatorMovement = (moveDirection: number | null): void => {
   if (moveDirection !== null) {
      setCameraVelocity(polarVec2(spectatorSpeed, moveDirection));
   } else {
      setCameraVelocity(new Point(0, 0));
   }
}

const updateNonSpectatorMovement = (moveDirection: number | null): void => {
   if (playerInstance === null) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(playerInstance);

   if (moveDirection !== null) {
      playerMoveIntention = moveDirection;

      const playerAction = getInstancePlayerAction(InventoryName.hotbar);
      
      let acceleration: number;
      if (keyIsPressed("l")) {
         acceleration = PLAYER_LIGHTSPEED_ACCELERATION;
      // @Bug: doesn't account for offhand
      } else if (playerAction === LimbAction.eat || playerAction === LimbAction.useMedicine || playerAction === LimbAction.chargeBow || playerAction === LimbAction.chargeSpear || playerAction === LimbAction.loadCrossbow || playerAction === LimbAction.block || playerAction === LimbAction.windShieldBash || playerAction === LimbAction.pushShieldBash || playerAction === LimbAction.returnShieldBashToRest || playerIsPlacingEntity()) {
         acceleration = PLAYER_SLOW_ACCELERATION;
      } else {
         acceleration = PLAYER_ACCELERATION;
      }

      // If discombobulated, limit the acceleration to the discombobulated acceleration
      if (discombobulationTimer > 0 && acceleration > PLAYER_DISCOMBOBULATED_ACCELERATION) {
         acceleration = PLAYER_DISCOMBOBULATED_ACCELERATION;
      }

      acceleration *= getPlayerMoveSpeedMultiplier(moveDirection);

      // @INCOMPLETE i reworked lastPlantCollisionTicks out of existence
      // if (latencyGameState.lastPlantCollisionTicks >= currentSnapshot.tick - 1) {
      //    acceleration *= 0.5;
      // }
      
      const playerHitbox = transformComponent.hitboxes[0];
      
      const accelerationX = acceleration * Math.sin(moveDirection);
      const accelerationY = acceleration * Math.cos(moveDirection);

      applyAccelerationFromGround(playerHitbox, accelerationX, accelerationY);
   } else {
      playerMoveIntention = -999;
   }
}

/** Updates the player's movement to match what keys are being pressed. */
export function updatePlayerMovement(): void {
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

   if (isSpectating) {
      updateSpectatorMovement(moveDirection);
   } else {
      updateNonSpectatorMovement(moveDirection);
   }
}

export function playerIsPlacingEntity(): boolean {
   const selectedItemInfo = getSelectedItemInfo();
   return selectedItemInfo !== null && ITEM_TYPE_RECORD[selectedItemInfo.item.type] === "placeable";
}

export function onItemSelect(itemType: ItemType): void {}

export function onItemDeselect(itemType: ItemType, isOffhand: boolean): void {
   if (playerInstance === null) {
      return;
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);
   
   const limb = inventoryUseComponent.limbInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[itemType];
   switch (itemCategory) {
      case "healing": {
         unuseItem(itemType);
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
         // Clear entity ghost
         if (placeableEntityGhostRenderInfo !== null) {
            removeGhostRenderInfo(placeableEntityGhostRenderInfo);
            placeableEntityGhostRenderInfo = null;
         }
         break;
      }
   }
}

const unuseItem = (itemType: ItemType): void => {
   if (playerInstance === null) {
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   
   switch (ITEM_TYPE_RECORD[itemType]) {
      case "healing": {
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

const onItemStartUse = (itemType: ItemType, itemInventoryName: InventoryName, itemSlot: number): void => {
   if (playerInstance === null) {
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);

   const attackInfo = getItemAttackInfo(itemType);
   if (attackInfo.attackTimings.blockTimeTicks !== null) {
      const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);

      // Start blocking
      if (limb.action === LimbAction.none) {
         if (!itemIsResting(itemInventoryName)) {
            const initialLimbState = getCurrentLimbState(limb);
            
            limb.action = LimbAction.engageBlock;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks;
            limb.currentActionRate = 1;
            // @Speed: why are we copying?
            limb.currentActionStartLimbState = copyLimbState(initialLimbState);
            limb.currentActionEndLimbState = limb.heldItemType !== null && ITEM_TYPE_RECORD[limb.heldItemType] === "shield" ? SHIELD_BLOCKING_LIMB_STATE : BLOCKING_LIMB_STATE;
            
            sendStartItemUsePacket(hotbarSelectedItemSlot);
         }
         return;
      // Feign attack
      } else if (limb.action === LimbAction.windAttack || (limb.action === LimbAction.attack && limb.currentActionElapsedTicks <= AttackVars.FEIGN_SWING_TICKS_LEEWAY)) {
         // @Copynpaste
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const progress = secondsSinceLastAction * Settings.TICK_RATE / limb.currentActionDurationTicks;

         const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
         
         limb.action = LimbAction.feignAttack;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionElapsedTicks = AttackVars.FEIGN_TIME_TICKS;
         limb.currentActionRate = 1;
         limb.currentActionStartLimbState = interpolateLimbState(limb.currentActionStartLimbState, limb.currentActionEndLimbState, progress);
         limb.currentActionEndLimbState = RESTING_LIMB_STATES[limbConfiguration];
      // Buffer block
      } else {
         attackBufferTime = INPUT_COYOTE_TIME;
         bufferedInputType = BufferedInputType.block;
      }
   }

   const itemCategory = ITEM_TYPE_RECORD[itemType];
   switch (itemCategory) {
      case "healing": {
         const healthComponent = HealthComponentArray.getComponent(playerInstance);

         const maxHealth = TRIBE_INFO_RECORD[playerTribe.tribeType].maxHealthPlayer;
         if (healthComponent.health >= maxHealth) {
            break;
         }

         const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
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
            limb.lastEatTicks = currentSnapshot.tick;

            sendStartItemUsePacket(hotbarSelectedItemSlot);
            // @Incomplete
            // if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            //    // @Cleanup
            //    const otherUseInfo = inventoryUseComponent.limbInfos[isOffhand ? 0 : 1];
            //    otherUseInfo.action = action;
            //    otherUseInfo.lastEatTicks = currentSnapshot.tick;
            // }
         }

         break;
      }
      case "crossbow": {
         if (!hotbarCrossbowLoadProgressRecord.hasOwnProperty(itemSlot) || hotbarCrossbowLoadProgressRecord[itemSlot]! < 1) {
            // Start loading crossbow
            const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
            limb.action = LimbAction.loadCrossbow;
            limb.lastCrossbowLoadTicks = currentSnapshot.tick;
            playHeadSound("crossbow-load.mp3", 0.4, 1);
         } else {
            // Fire crossbow
            sendItemUsePacket(hotbarSelectedItemSlot);
            playHeadSound("crossbow-fire.mp3", 0.4, 1);
         }
         break;
      }
      case "bow": {
         const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
         
         const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar)!;
         if (countItemTypesInInventory(hotbarInventory, ItemType.woodenArrow) > 0) {
            // The holding limb goes from wherever it is to being in the held position
            
            const holdingLimb = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
            const startHoldingLimbState = getCurrentLimbState(holdingLimb);
            
            holdingLimb.action = LimbAction.engageBow;
            holdingLimb.currentActionElapsedTicks = 0;
            holdingLimb.currentActionDurationTicks = QUIVER_ACCESS_TIME_TICKS + QUIVER_PULL_TIME_TICKS;
            holdingLimb.currentActionRate = 1;
            holdingLimb.currentActionStartLimbState = startHoldingLimbState;
            holdingLimb.currentActionEndLimbState = BOW_HOLDING_LIMB_STATE;

            // Meanwhile the drawing limb pulls an arrow out
            
            const drawingLimb = getLimbByInventoryName(inventoryUseComponent, InventoryName.offhand);
            const startDrawingLimbState = getCurrentLimbState(drawingLimb);
            
            drawingLimb.action = LimbAction.moveLimbToQuiver;
            drawingLimb.currentActionElapsedTicks = 0;
            drawingLimb.currentActionDurationTicks = QUIVER_ACCESS_TIME_TICKS;
            drawingLimb.currentActionRate = 1;
            drawingLimb.currentActionStartLimbState = startDrawingLimbState;
            drawingLimb.currentActionEndLimbState = QUIVER_PULL_LIMB_STATE;
            
            sendStartItemUsePacket(hotbarSelectedItemSlot);
         }

         break;
      }
      case "spear": {
         const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
         if (limb.action === LimbAction.none) {
            limb.action = LimbAction.chargeSpear;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = 3 * Settings.TICK_RATE;
            limb.currentActionRate = 1;
         }
         break;
      }
      case "battleaxe": {
         // If an axe is already thrown, don't throw another
         const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
         if (limb.thrownBattleaxeItemID !== -1) {
            break;
         }

         limb.action = LimbAction.chargeBattleaxe;
         limb.lastBattleaxeChargeTicks = currentSnapshot.tick;
         break;
      }
      case "glove":
      case "armour": {
         sendItemUsePacket(hotbarSelectedItemSlot);
         break;
      }
      case "placeable": {
         const playerHitbox = transformComponent.hitboxes[0];

         const layer = getEntityLayer(playerInstance);
         const structureType = ITEM_INFO_RECORD[itemType as PlaceableItemType].entityType;
         const placeInfo = calculateEntityPlaceInfo(playerHitbox.box.position, playerHitbox.box.angle, structureType, layer);
         
         if (placeInfo.isValid) {
            const limb = getLimbByInventoryName(inventoryUseComponent, itemInventoryName);
            limb.lastAttackTicks = currentSnapshot.tick;

            sendItemUsePacket();
         }

         break;
      }
   }
}

export function playBowFireSound(sourceEntity: Entity, bowItemType: ItemType): void {
   // @Hack
   const transformComponent = TransformComponentArray.getComponent(sourceEntity);
   const hitbox = transformComponent.hitboxes[0];

   switch (bowItemType) {
      case ItemType.wooden_bow: {
         playSoundOnHitbox("bow-fire.mp3", 0.4, 1, sourceEntity, hitbox, false);
         break;
      }
      case ItemType.reinforced_bow: {
         playSoundOnHitbox("reinforced-bow-fire.mp3", 0.2, 1, sourceEntity, hitbox, false);
         break;
      }
      case ItemType.ice_bow: {
         playSoundOnHitbox("ice-bow-fire.mp3", 0.4, 1, sourceEntity, hitbox, false);
         break;
      }
   }
}

const onItemEndUse = (item: Item, inventoryName: InventoryName): void => {
   if (playerInstance === null) {
      return;
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);

   const limb = getLimbByInventoryName(inventoryUseComponent, inventoryName);

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
               sendItemUsePacket(hotbarSelectedItemSlot);
            } else {
               sendStopItemUsePacket();
               playHeadSound("error.mp3", 0.4, 1);
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
            // @INCOMPLETE since I removed inventoryState
            // if (inventoryName === InventoryName.offhand) {
            //    inventoryState.setOffhandThrownBattleaxeItemID(item.id);
            // } else {
            //    inventoryState.setHotbarThrownBattleaxeItemID(item.id);
            // }
         }
         
         if (limb.action === LimbAction.chargeBow && limb.currentActionElapsedTicks >= limb.currentActionDurationTicks) {
            sendItemUsePacket(hotbarSelectedItemSlot);
            // @HACK: commented it out cuz it was doubling the sound due to the one also received by the server. But this is actually the correct thing to do, to eliminate ping delay, have this play immediately locally and then disregard the sound sent by the server. Same with all sounds caused by the player which we know will happen immediately.
            // playBowFireSound(playerInstance!, item.type);
         }
            
         const holdingLimb = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
         const startHoldingLimbState = getCurrentLimbState(holdingLimb);
         
         holdingLimb.action = LimbAction.mainArrowReleased;
         holdingLimb.currentActionElapsedTicks = 0;
         holdingLimb.currentActionDurationTicks = ARROW_RELEASE_WAIT_TIME_TICKS;
         holdingLimb.currentActionStartLimbState = copyLimbState(startHoldingLimbState);
         holdingLimb.currentActionEndLimbState = copyLimbState(startHoldingLimbState);

         const drawingLimb = getLimbByInventoryName(inventoryUseComponent, InventoryName.offhand);
         const startDrawingLimbState = getCurrentLimbState(drawingLimb);

         drawingLimb.action = LimbAction.arrowReleased;
         drawingLimb.currentActionElapsedTicks = 0;
         drawingLimb.currentActionDurationTicks = ARROW_RELEASE_WAIT_TIME_TICKS;
         // @Garbage
         drawingLimb.currentActionStartLimbState = copyLimbState(startDrawingLimbState);
         // @Garbage
         drawingLimb.currentActionEndLimbState = copyLimbState(startDrawingLimbState);

         break;
      }
      case "crossbow": {
         limb.action = LimbAction.none;
         break;
      }
   }
}

export function selectItemSlot(itemSlot: number): void {
   if (playerInstance === null || itemSlot === hotbarSelectedItemSlot) {
      return;
   }

   // Don't switch if the player is blocking
   const playerAction = getInstancePlayerAction(InventoryName.hotbar);
   if (playerAction === LimbAction.block || playerAction === LimbAction.returnBlockToRest) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);
   
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar)!;
   
   const previousItem = hotbarInventory.itemSlots[hotbarSelectedItemSlot];

   hotbarSelectedItemSlot = itemSlot;
   hotbarFuncs.selectItemSlot(hotbarInventory, itemSlot);

   // Clear any buffered inputs
   attackBufferTime = 0;

   // Deselect the previous item and select the new item
   if (typeof previousItem !== "undefined") {
      onItemDeselect(previousItem.type, false);
   }
   const newItem = hotbarInventory.itemSlots[itemSlot];
   if (typeof newItem !== "undefined") {
      onItemSelect(newItem.type);

      // @Temporary
      // I used to have the following code here:
      // if (rightMouseButtonIsPressed) {
      //    onItemStartUse(newItem.type, InventoryName.hotbar, itemSlot);
      // }
      // But I've decided that this isn't the right behaviour, as we don't want items to be able to be switched while they are being used.
   }

   const hotbarUseInfo = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
   hotbarUseInfo.selectedItemSlot = itemSlot;

   // Update the held item type
   updatePlayerHeldItem(InventoryName.hotbar, itemSlot);

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
   if (playerInstance === null) {
      return;
   }
   
   const itemCategory = ITEM_TYPE_RECORD[itemType];
   switch (itemCategory) {
      case "healing": {
         // If the player can no longer eat food without wasting it, stop eating

         const healthComponent = HealthComponentArray.getComponent(playerInstance);

         const maxHealth = TRIBE_INFO_RECORD[playerTribe.tribeType].maxHealthPlayer;
         const playerAction = getInstancePlayerAction(InventoryName.hotbar);
         if ((playerAction === LimbAction.eat || playerAction === LimbAction.useMedicine) && healthComponent.health >= maxHealth) {
            unuseItem(itemType);
         }

         break;
      }
      case "placeable": {
         // Create a ghost entity

         const transformComponent = TransformComponentArray.getComponent(playerInstance);
         const playerHitbox = transformComponent.hitboxes[0];

         const layer = getCurrentLayer();
         
         const itemInfo = ITEM_INFO_RECORD[itemType] as PlaceableItemInfo;
         const entityType = itemInfo.entityType;
         
         const placeInfo = calculateEntityPlaceInfo(playerHitbox.box.position, playerHitbox.box.angle, entityType, layer);

         const serverComponentTypes = getEntityServerComponentTypes(entityType);
         
         const components = new Array<ServerComponentData<ServerComponentType>>();

         for (const componentType of serverComponentTypes) {
            switch (componentType) {
               case ServerComponentType.transform: {
                  const hitboxes = new Array<Hitbox>();
                  const staticHitboxes = new Array<Hitbox>();
                  for (const hitbox of placeInfo.hitboxes) {
                     hitboxes.push(hitbox);
                     // @Hack
                     staticHitboxes.push(hitbox);
                  }

                  const transformComponentData = createTransformComponentData(
                     hitboxes
                  );

                  components.push(transformComponentData);
                  break;
               }
               case ServerComponentType.health: {
                  const data = createHealthComponentData();
                  components.push(data);
                  break;
               }
               case ServerComponentType.statusEffect: {
                  const data = createStatusEffectComponentData();
                  components.push(data);
                  break;
               }
               case ServerComponentType.structure: {
                  components.push(createStructureComponentData());
                  break;
               }
               case ServerComponentType.tribe: {
                  components.push(createTribeComponentData(playerTribe));
                  break;
               }
               case ServerComponentType.buildingMaterial: {
                  components.push(createBuildingMaterialComponentData(BuildingMaterial.wood));
                  break;
               }
               case ServerComponentType.bracings: {
                  components.push(createBracingsComponentData());
                  break;
               }
               case ServerComponentType.inventory: {
                  components.push(createInventoryComponentData({}));
                  break;
               }
               case ServerComponentType.cooking: {
                  components.push(createCookingComponentData());
                  break;
               }
               case ServerComponentType.campfire: {
                  components.push(createCampfireComponentData());
                  break;
               }
               case ServerComponentType.furnace: {
                  components.push(createFurnaceComponentData());
                  break;
               }
               case ServerComponentType.spikes: {
                  components.push(createSpikesComponentData());
                  break;
               }
               case ServerComponentType.fireTorch: {
                  components.push(createFireTorchComponentData());
                  break;
               }
               case ServerComponentType.slurbTorch: {
                  components.push(createSlurbTorchComponentData());
                  break;
               }
               case ServerComponentType.barrel: {
                  components.push(createBarrelComponentData());
                  break;
               }
               case ServerComponentType.researchBench: {
                  components.push(createResearchBenchComponentData());
                  break;
               }
               case ServerComponentType.scrappy: {
                  components.push({});
                  break;
               }
               case ServerComponentType.cogwalker: {
                  components.push({});
                  break;
               }
               case ServerComponentType.craftingStation: {
                  components.push({
                     craftingStation: 0
                  });
                  break;
               }
               case ServerComponentType.automatonAssembler: {
                  components.push({});
                  break;
               }
               case ServerComponentType.turret: {
                  components.push({
                     aimDirection: 0,
                     chargeProgress: 0,
                     reloadProgress: 0
                  });
                  break;
               }
               case ServerComponentType.aiHelper: {
                  components.push({});
                  break;
               }
               case ServerComponentType.slingTurret: {
                  components.push({});
                  break;
               }
               case ServerComponentType.ammoBox: {
                  components.push({
                     ammoType: 0,
                     ammoRemaining: 0
                  });
                  break;
               }
               case ServerComponentType.ballista: {
                  components.push({});
                  break;
               }
               case ServerComponentType.mithrilAnvil: {
                  components.push({});
                  break;
               }
               case ServerComponentType.punjiSticks: {
                  components.push({});
                  break;
               }
               case ServerComponentType.fence: {
                  components.push({});
                  break;
               }
               case ServerComponentType.planterBox: {
                  components.push({
                     plantedEntityType: -1,
                     isFertilised: false
                  });
                  break;
               }
               case ServerComponentType.hut: {
                  components.push({
                     doorSwingAmount: 0,
                     isRecalling: false
                  });
                  break;
               }
               case ServerComponentType.totemBanner: {
                  components.push({
                     banners: []
                  });
                  break;
               }
               case ServerComponentType.floorSign: {
                  components.push({
                     message: ""
                  });
                  break;
               }
               default: {
                  throw new Error(ServerComponentType[componentType]);
               }
            }
         }

         const entityComponentData: EntityComponentData = {
            entityType: entityType,
            // @Hack: cast
            serverComponentData: components as any,
            // @HACK
            clientComponentData: getEntityClientComponentConfigs(entityType)
         };

         // Create the entity
         assert(getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.transform).hitboxes.length > 0);
         const creationInfo = createEntityCreationInfo(0, entityComponentData);

         const renderInfo = creationInfo.renderInfo;

         // @Hack: Could potentially get overridden in the future
         renderInfo.tintR = placeInfo.isValid ? 0 : 0.5;
         renderInfo.tintG = placeInfo.isValid ? 0 : -0.5;
         renderInfo.tintB = placeInfo.isValid ? 0 : -0.5;

         // Modify all the render part's opacity
         for (let i = 0; i < renderInfo.renderPartsByZIndex.length; i++) {
            const renderThing = renderInfo.renderPartsByZIndex[i];
            if (thingIsVisualRenderPart(renderThing)) {
               renderThing.opacity *= 0.5;
            }
         }

         // Remove any previous render info
         if (placeableEntityGhostRenderInfo !== null) {
            removeGhostRenderInfo(placeableEntityGhostRenderInfo);
         }
         
         placeableEntityGhostRenderInfo = renderInfo;
         addGhostRenderInfo(renderInfo);

         // @Hack: Manually set the render info's position and rotation
         // @INCOMPLETE
         // const transformComponentData = components[ServerComponentType.transform]!;
         // renderInfo.renderPosition.x = transformComponentData.position.x;
         // renderInfo.renderPosition.y = transformComponentData.position.y;
         // renderInfo.rotation = transformComponentData.rotation;

         break;
      }
   }
}