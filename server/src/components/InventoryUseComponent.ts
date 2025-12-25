import { BlockType, ServerComponentType } from "battletribes-shared/components";
import { Entity, LimbAction } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { ComponentArray } from "./ComponentArray";
import { BowItemInfo, getItemAttackInfo, Inventory, InventoryName, Item, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType, QUIVER_PULL_TIME_TICKS, RETURN_FROM_BOW_USE_TIME_TICKS } from "battletribes-shared/items/items";
import { Packet } from "battletribes-shared/packets";
import { getInventory, InventoryComponentArray } from "./InventoryComponent";
import { customTickIntervalHasPassed, Point } from "battletribes-shared/utils";
import { Box } from "battletribes-shared/boxes/boxes";
import { TransformComponentArray } from "./TransformComponent";
import { AttackVars, BLOCKING_LIMB_STATE, copyLimbState, LimbConfiguration, LimbState, SHIELD_BLOCKING_LIMB_STATE, RESTING_LIMB_STATES, interpolateLimbState } from "battletribes-shared/attack-patterns";
import { registerDirtyEntity, registerEntityTickEvent } from "../server/player-clients";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import Layer from "../Layer";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { createBlockAttackConfig } from "../entities/block-attack";
import { createEntity, destroyEntity, entityExists, getEntityLayer } from "../world";
import { createSwingAttackConfig } from "../entities/swing-attack";
import { applyKnockback } from "../hitboxes";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";

// @Cleanup: Make into class Limb with getHeldItem method
export interface LimbInfo {
   readonly associatedInventory: Inventory;
   selectedItemSlot: number;
   readonly spearWindupCooldowns: Partial<Record<number, number>>;
   readonly crossbowLoadProgressRecord: Partial<Record<number, number>>;
   foodEatingTimer: number;
   action: LimbAction;
   lastAttackTicks: number;
   lastEatTicks: number;
   // @Cleanup: May be able to merge all 3 of these into 1
   lastBowChargeTicks: number;
   lastSpearChargeTicks: number;
   lastBattleaxeChargeTicks: number;
   lastCrossbowLoadTicks: number;
   lastCraftTicks: number;
   lastAttackWindupTicks: number;
   thrownBattleaxeItemID: number;
   lastAttackCooldown: number;
   /** Artificial cooldown added to tribesmen to make them a bit worse at combat */
   extraAttackCooldownTicks: number;

   /** Tick timestamp when the current action was started */
   currentActionElapsedTicks: number;
   /** Expected duration of the current action in ticks */
   currentActionDurationTicks: number;
   /** Number of ticks that the current animation is being paused. */
   currentActionPauseTicksRemaining: number;
   currentActionRate: number;

   currentActionStartLimbState: LimbState;
   currentActionEndLimbState: LimbState;

   swingAttack: Entity;
   blockAttack: Entity;
   
   // @Hack @Memory: Shouldn't be stored like this, should only be sent when block events happen
   // @Bug: If multiple attacks are blocked in 1 tick by the same damage box, only one of them is sent. 
   lastBlockTick: number;
   blockPositionX: number;
   blockPositionY: number;
   blockType: BlockType;
}

// @Copynpaste
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

export function limbHeldItemCanBeSwitched(limb: LimbInfo): boolean {
   return limb.action === LimbAction.none && limb.currentActionElapsedTicks >= limb.currentActionDurationTicks;
}

const addLimbStateToPacket = (packet: Packet, limbState: LimbState): void => {
   packet.writeNumber(limbState.direction);
   packet.writeNumber(limbState.extraOffset);
   packet.writeNumber(limbState.angle);
   packet.writeNumber(limbState.extraOffsetX);
   packet.writeNumber(limbState.extraOffsetY);
}

export class InventoryUseComponent {
   public readonly associatedInventoryNames = new Array<InventoryName>();
   
   public readonly limbInfos = new Array<LimbInfo>();
   private readonly inventoryUseInfoRecord: Partial<Record<InventoryName, LimbInfo>> = {};

   public globalAttackCooldown = 0;

   // @Hack: limb configuration. Can't be called in this function as the limbInfos array won't have been populated
   public createLimb(associatedInventory: Inventory, limbConfiguration: LimbConfiguration): void {
      const restingLimbState = RESTING_LIMB_STATES[limbConfiguration];

      const useInfo: LimbInfo = {
         associatedInventory: associatedInventory,
         selectedItemSlot: 1,
         spearWindupCooldowns: {},
         crossbowLoadProgressRecord: {},
         foodEatingTimer: 0,
         action: LimbAction.none,
         lastAttackTicks: 0,
         lastEatTicks: 0,
         lastBowChargeTicks: 0,
         lastSpearChargeTicks: 0,
         lastBattleaxeChargeTicks: 0,
         lastCrossbowLoadTicks: 0,
         lastCraftTicks: 0,
         lastAttackWindupTicks: 0,
         thrownBattleaxeItemID: -1,
         lastAttackCooldown: Settings.DEFAULT_ATTACK_COOLDOWN,
         extraAttackCooldownTicks: 0,
         currentActionElapsedTicks: 0,
         currentActionDurationTicks: 0,
         currentActionPauseTicksRemaining: 0,
         currentActionRate: 1,
         currentActionStartLimbState: copyLimbState(restingLimbState),
         currentActionEndLimbState: copyLimbState(restingLimbState),
         swingAttack: 0,
         blockAttack: 0,
         lastBlockTick: 0,
         blockPositionX: 0,
         blockPositionY: 0,
         blockType: BlockType.toolBlock
      };
      
      this.limbInfos.push(useInfo);
      this.inventoryUseInfoRecord[associatedInventory.name] = useInfo;
   }

   public getLimbInfo(inventoryName: InventoryName): LimbInfo {
      const useInfo = this.inventoryUseInfoRecord[inventoryName];

      if (typeof useInfo === "undefined") {
         throw new Error("Use info doesn't exist");
      }

      return useInfo;
   }

   public hasUseInfo(inventoryName: InventoryName): boolean {
      return typeof this.inventoryUseInfoRecord[inventoryName] !== "undefined";
   }
}

export const InventoryUseComponentArray = new ComponentArray<InventoryUseComponent>(ServerComponentType.inventoryUse, true, getDataLength, addDataToPacket);
InventoryUseComponentArray.onJoin = onJoin;
InventoryUseComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onJoin(entity: Entity): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   
   for (let i = 0; i < inventoryUseComponent.associatedInventoryNames.length; i++) {
      const inventoryName = inventoryUseComponent.associatedInventoryNames[i];
      const inventory = getInventory(inventoryComponent, inventoryName);

      // @Hack
      const limbConfiguration = inventoryUseComponent.associatedInventoryNames.length - 1;
      inventoryUseComponent.createLimb(inventory, limbConfiguration);
   }
}

const currentActionHasFinished = (limbInfo: LimbInfo): boolean => {
   return limbInfo.currentActionElapsedTicks >= limbInfo.currentActionDurationTicks;
}

// @Cleanup: remove once proper method is made
// @Cleanup: also make getHeldItemAttackInfo method
export function getHeldItem(limbInfo: LimbInfo): Item | null {
   const item = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
   return (typeof item !== "undefined" && limbInfo.thrownBattleaxeItemID !== item.id) ? item : null;
}

export function getLimbConfiguration(inventoryUseComponent: InventoryUseComponent): LimbConfiguration {
   switch (inventoryUseComponent.limbInfos.length) {
      case 1: return LimbConfiguration.singleHanded;
      case 2: return LimbConfiguration.twoHanded;
      default: throw new Error();
   }
}

export function getCurrentLimbState(limb: LimbInfo): LimbState {
   if (limb.currentActionDurationTicks === 0 || limb.currentActionElapsedTicks >= limb.currentActionDurationTicks) {
      // If the action has duration 0, assume that it is finished
      return copyLimbState(limb.currentActionEndLimbState);
   } else {
      const progress = limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
      return interpolateLimbState(limb.currentActionStartLimbState, limb.currentActionEndLimbState, progress);
   }
}

const boxIsCollidingWithSubtile = (box: Box, subtileX: number, subtileY: number): boolean => {
   // @Speed
   const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
   const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
   
   return box.getCollisionResult(tileBox).isColliding;
}

const getBoxCollidingWallSubtiles = (layer: Layer, box: Box): ReadonlyArray<number> => {
   const boundsMinX = box.calculateBoundsMinX();
   const boundsMaxX = box.calculateBoundsMaxX();
   const boundsMinY = box.calculateBoundsMinY();
   const boundsMaxY = box.calculateBoundsMaxY();

   const minSubtileX = Math.max(Math.floor(boundsMinX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxSubtileX = Math.min(Math.floor(boundsMaxX / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   const minSubtileY = Math.max(Math.floor(boundsMinY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxSubtileY = Math.min(Math.floor(boundsMaxY / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);

   const collidingWallSubtiles = new Array<number>();
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (layer.subtileIsWall(subtileIndex) && boxIsCollidingWithSubtile(box, subtileX, subtileY)) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            collidingWallSubtiles.push(subtileIndex);
         }
      }
   }
   return collidingWallSubtiles;
}

function onTick(entity: Entity): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      inventoryUseComponent.globalAttackCooldown--;
   }

   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limb = inventoryUseComponent.limbInfos[i];

      // @Cleanup @Bandwidth: When blocking, once the block is finished going up the entity should no longer be dirtied by this
      // Certain actions should always show an update for the player
      if (limb.action !== LimbAction.none) {
         registerDirtyEntity(entity);
      }

      // @Hack
      if (limb.action === LimbAction.eat && customTickIntervalHasPassed(limb.currentActionElapsedTicks, 0.19)) {
         const event: EntityTickEvent = {
            entityID: entity,
            type: EntityTickEventType.foodMunch,
            data: 0
         };
         registerEntityTickEvent(entity, event);
      }

      if (limb.currentActionPauseTicksRemaining > 0) {
         limb.currentActionPauseTicksRemaining--;
      } else {
         limb.currentActionElapsedTicks += limb.currentActionRate;
      }

      if (currentActionHasFinished(limb)) {
         switch (limb.action) {
            case LimbAction.engageBlock: {
               const blockAttackConfig = createBlockAttackConfig(entity, limb);
               limb.blockAttack = createEntity(blockAttackConfig, getEntityLayer(entity), 0);

               limb.action = LimbAction.block;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = 0;
                  
               break;
            }
            case LimbAction.windShieldBash: {
               limb.action = LimbAction.pushShieldBash;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_PUSH_TIME_TICKS;

               // Push forwards
               const transformComponent = TransformComponentArray.getComponent(entity);
               const entityHitbox = transformComponent.hitboxes[0];
               
               applyKnockback(entityHitbox, 250, entityHitbox.box.angle);

               // @Incomplete
               
               // const blockAttack = createBlockAttackConfig(entity, limb);
               // createEntity(blockAttack, getEntityLayer(entity), 0);

               // limb.blockBox.isActive = false;
               
               // limb.limbDamageBox.isActive = true;
               // limb.limbDamageBox.isBlocked = false;
               // limb.heldItemDamageBox.isActive = true;
               // limb.heldItemDamageBox.isBlocked = false;

               // const damageBoxInfo = SHIELD_BLOCKING_DAMAGE_BOX_INFO;

               // // @Copynpaste
               // assertBoxIsRectangular(limb.heldItemDamageBox.box);
               // limb.heldItemDamageBox.box.offset.x = damageBoxInfo.offsetX * (isFlipped ? -1 : 1);
               // limb.heldItemDamageBox.box.offset.y = damageBoxInfo.offsetY;
               // limb.heldItemDamageBox.box.width = damageBoxInfo.width;
               // limb.heldItemDamageBox.box.height = damageBoxInfo.height;
               // limb.heldItemDamageBox.box.relativeAngle = damageBoxInfo.angle * (isFlipped ? -1 : 1);
               break;
            }
            case LimbAction.pushShieldBash: {
               limb.action = LimbAction.returnShieldBashToRest;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_RETURN_TIME_TICKS;

               // limb.limbDamageBox.isActive = false;
               // limb.heldItemDamageBox.isActive = false;
               break;
            }
            case LimbAction.returnShieldBashToRest: {
               limb.action = LimbAction.block;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = 0;
               break;
            }
            case LimbAction.windAttack: {
               const heldItem = getHeldItem(limb);
               const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);

               const attackPattern = heldItemAttackInfo.attackPatterns![getLimbConfiguration(inventoryUseComponent)];
               
               limb.action = LimbAction.attack;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.swingTimeTicks;
               // @Speed: Garbage collection
               limb.currentActionStartLimbState = copyLimbState(attackPattern.windedBack);
               // @Speed: Garbage collection
               limb.currentActionEndLimbState = copyLimbState(attackPattern.swung);
               
               const swingAttackConfig = createSwingAttackConfig(new Point(0, 0), 0, entity, limb);
               limb.swingAttack = createEntity(swingAttackConfig, getEntityLayer(entity), 0);
               break;
            }
            case LimbAction.attack: {
               const heldItem = getHeldItem(limb);

               const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
            
               const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
               const attackPattern = heldItemAttackInfo.attackPatterns![limbConfiguration];
            
               limb.action = LimbAction.returnAttackToRest;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.returnTimeTicks;
               // @Bug: shouldn't it copy the current state?
               // @Speed: Garbage collection
               limb.currentActionStartLimbState = copyLimbState(attackPattern.swung);
               // @Speed: Garbage collection
               limb.currentActionEndLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
            
               // If the swing hits something partway through it can be destroyed
               if (entityExists(limb.swingAttack)) {
                  destroyEntity(limb.swingAttack);
               }
               break;
            }
            case LimbAction.returnAttackToRest: {
               const heldItem = getHeldItem(limb);
               const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);

               const limbConfiguration = getLimbConfiguration(inventoryUseComponent);

               limb.action = LimbAction.none;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.restTimeTicks;
               limb.currentActionStartLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
               limb.currentActionEndLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
               break;
            }
            case LimbAction.returnBlockToRest: {
               limb.action = LimbAction.none;
               break;
            }
            // If finished moving limb to quiver, move from quiver to charge start limbstate
            case LimbAction.moveLimbToQuiver: {
               const startLimbState = getCurrentLimbState(limb);
         
               limb.action = LimbAction.moveLimbFromQuiver;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = QUIVER_PULL_TIME_TICKS;
               limb.currentActionStartLimbState = startLimbState;
               limb.currentActionEndLimbState = BOW_DRAWING_CHARGE_START_LIMB_STATE;
               break;
            }
            // If finished moving limb from quiver, start charging bow
            case LimbAction.moveLimbFromQuiver: {
               const startLimbState = getCurrentLimbState(limb);
               // @Hack
               const itemInfo = ITEM_INFO_RECORD[ItemType.wooden_bow] as BowItemInfo;
               
               limb.action = LimbAction.pullBackArrow;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = itemInfo.shotChargeTimeTicks;
               limb.currentActionStartLimbState = startLimbState;
               limb.currentActionEndLimbState = BOW_DRAWING_CHARGE_END_LIMB_STATE;
               
               const otherInventoryName = i === 0 ? InventoryName.offhand : InventoryName.hotbar;
               const otherLimb = inventoryUseComponent.getLimbInfo(otherInventoryName);
               const otherLimbStartState = getCurrentLimbState(otherLimb);
               
               otherLimb.action = LimbAction.chargeBow;
               otherLimb.currentActionElapsedTicks = 0;
               otherLimb.currentActionDurationTicks = itemInfo.shotChargeTimeTicks;
               // Don't move the limb
               otherLimb.currentActionStartLimbState = otherLimbStartState;
               otherLimb.currentActionEndLimbState = otherLimbStartState;
               break;
            }
            // If finished resting after arrow release, return to default state
            case LimbAction.arrowReleased:
            case LimbAction.mainArrowReleased: {
               const startingLimbState = getCurrentLimbState(limb);
               const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
               
               limb.action = LimbAction.returnFromBow;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = RETURN_FROM_BOW_USE_TIME_TICKS;
               limb.currentActionStartLimbState = copyLimbState(startingLimbState);
               limb.currentActionEndLimbState = RESTING_LIMB_STATES[limbConfiguration];
               break;
            }
            case LimbAction.returnFromBow: {
               limb.action = LimbAction.none;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = 0;
               break;
            }
         }
      }

      // @Temporary? why did i comment this out
      // If the attack collides with a wall, cancel it
      // if (limb.action === LimbAction.attack) {
      //    const layer = getEntityLayer(entity);
         
      //    if (limb.heldItemDamageBox.isActive) {
      //       const heldItemCollidingSubtiles = getBoxCollidingWallSubtiles(layer, limb.heldItemDamageBox.box);
      //       if (heldItemCollidingSubtiles.length > 0) {
      //          cancelAttack(limb);
      //          limb.heldItemDamageBox.isBlockedByWall = true;
      //          limb.heldItemDamageBox.blockingSubtileIndex = heldItemCollidingSubtiles[0];

      //          // Damage the subtiles with the pickaxe
      //          const heldItem = getHeldItem(limb)!;
      //          if (ITEM_TYPE_RECORD[heldItem.type] === "pickaxe") {
      //             const itemInfo = ITEM_INFO_RECORD[heldItem.type] as PickaxeItemInfo;

      //             for (let i = 0; i < heldItemCollidingSubtiles.length; i++) {
      //                if (limb.heldItemDamageBox.wallSubtileDamageGiven >= itemInfo.wallDamage) {
      //                   break;
      //                }
                     
      //                const subtileIndex = heldItemCollidingSubtiles[i];
      //                const damageDealt = damageWallSubtitle(layer, subtileIndex, itemInfo.wallDamage);

      //                limb.heldItemDamageBox.wallSubtileDamageGiven += damageDealt;
      //             }
      //          }
      //       }
      //    } else if (limb.limbDamageBox.isActive) {
      //       const limbCollidingSubtiles = getBoxCollidingWallSubtiles(layer, limb.limbDamageBox.box);
      //       if (limbCollidingSubtiles.length > 0) {
      //          cancelAttack(limb);
      //          limb.limbDamageBox.isBlockedByWall = true;
      //          limb.limbDamageBox.blockingSubtileIndex = limbCollidingSubtiles[0];
      //       }
      //    }
      // }
      // @Copynpaste
      // Update damage box for shield bashes
      if (limb.action === LimbAction.pushShieldBash) {
         const swingProgress = limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
         // @Incomplete
         // lerpLimbBetweenStates(entity, limb, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BASH_PUSHED_LIMB_STATE, swingProgress, isFlipped);
      }

      // Update blocking damage box when blocking
      if (limb.action === LimbAction.block) {
         if (limb.currentActionElapsedTicks >= limb.currentActionDurationTicks) {
            const heldItem = getHeldItem(limb);
            const blockingState = heldItem !== null && ITEM_TYPE_RECORD[heldItem.type] === "shield" ? SHIELD_BLOCKING_LIMB_STATE : BLOCKING_LIMB_STATE;
            // @Incomplete
            // setHitboxToState(entity, limb, blockingState, isFlipped);
         }
      }

      // @Incomplete
      // if (limbInfo.itemAttackCooldowns[limbInfo.selectedItemSlot] === undefined && limbInfo.extraAttackCooldownTicks > 0) {
      //    limbInfo.extraAttackCooldownTicks--;
      // }
   }
}

export function getCrossbowLoadProgressRecordLength(useInfo: LimbInfo): number {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * Object.keys(useInfo.crossbowLoadProgressRecord).length;
   return lengthBytes;
}

export function addCrossbowLoadProgressRecordToPacket(packet: Packet, useInfo: LimbInfo): void {
   // @Copynpaste
   const crossbowLoadProgressEntries = Object.entries(useInfo.crossbowLoadProgressRecord).map(([a, b]) => [Number(a), b]) as Array<[number, number]>;
   packet.writeNumber(crossbowLoadProgressEntries.length);
   for (let i = 0; i < crossbowLoadProgressEntries.length; i++) {
      const [itemSlot, cooldown] = crossbowLoadProgressEntries[i];
      packet.writeNumber(itemSlot);
      packet.writeNumber(cooldown);
   }
}

function getDataLength(entity: Entity): number {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   for (const useInfo of inventoryUseComponent.limbInfos) {
      lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * Object.keys(useInfo.spearWindupCooldowns).length;
      lengthBytes += getCrossbowLoadProgressRecordLength(useInfo);
      lengthBytes += 21 * Float32Array.BYTES_PER_ELEMENT;
      // Limb states
      lengthBytes += 2 * 5 * Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   packet.writeNumber(inventoryUseComponent.limbInfos.length);
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limb = inventoryUseComponent.limbInfos[i];

      packet.writeNumber(limb.associatedInventory.name);
      packet.writeNumber(limb.selectedItemSlot);
      const heldItem = getHeldItem(limb);
      packet.writeNumber(heldItem !== null ? heldItem.type : -1);

      // @Cleanup: Copy and paste
      const spearWindupCooldownEntries = Object.entries(limb.spearWindupCooldowns).map(([a, b]) => [Number(a), b]) as Array<[number, number]>;
      packet.writeNumber(spearWindupCooldownEntries.length);
      for (let i = 0; i < spearWindupCooldownEntries.length; i++) {
         const [itemSlot, cooldown] = spearWindupCooldownEntries[i];
         packet.writeNumber(itemSlot);
         packet.writeNumber(cooldown);
      }

      addCrossbowLoadProgressRecordToPacket(packet, limb);

      packet.writeNumber(limb.foodEatingTimer);
      packet.writeNumber(limb.action);
      packet.writeNumber(limb.lastAttackTicks);
      packet.writeNumber(limb.lastEatTicks);
      packet.writeNumber(limb.lastBowChargeTicks);
      packet.writeNumber(limb.lastSpearChargeTicks);
      packet.writeNumber(limb.lastBattleaxeChargeTicks);
      packet.writeNumber(limb.lastCrossbowLoadTicks);
      packet.writeNumber(limb.lastCraftTicks);
      packet.writeNumber(limb.thrownBattleaxeItemID);
      packet.writeNumber(limb.lastAttackCooldown);
      packet.writeNumber(limb.currentActionElapsedTicks);
      packet.writeNumber(limb.currentActionDurationTicks);
      packet.writeNumber(limb.currentActionPauseTicksRemaining);
      packet.writeNumber(limb.currentActionRate);
      packet.writeNumber(limb.swingAttack);
      packet.writeNumber(limb.blockAttack);
      packet.writeNumber(limb.lastBlockTick);
      packet.writeNumber(limb.blockPositionX);
      packet.writeNumber(limb.blockPositionY);
      packet.writeNumber(limb.blockType);

      addLimbStateToPacket(packet, limb.currentActionStartLimbState);
      addLimbStateToPacket(packet, limb.currentActionEndLimbState);
   }
}

// @Cleanup: this shit is ASS. Kill it all
export function setLimbActions(inventoryUseComponent: InventoryUseComponent, limbAction: LimbAction): void {
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];
      limbInfo.action = limbAction;
   }
}