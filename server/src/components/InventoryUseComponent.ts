import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, LimbAction } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { ComponentArray } from "./ComponentArray";
import { getItemAttackInfo, Inventory, InventoryName, Item, ITEM_TYPE_RECORD } from "battletribes-shared/items/items";
import { Packet } from "battletribes-shared/packets";
import { getInventory, InventoryComponentArray } from "./InventoryComponent";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { lerp, Point } from "battletribes-shared/utils";
import { DamageBoxComponentArray } from "./DamageBoxComponent";
import { ServerBlockBox, ServerDamageBox } from "../boxes";
import { assertBoxIsRectangular, BlockType, updateBox } from "battletribes-shared/boxes/boxes";
import { TransformComponentArray } from "./TransformComponent";
import { AttackVars, BLOCKING_LIMB_STATE, copyLimbState, LimbState, SHIELD_BASH_PUSHED_LIMB_STATE, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BLOCKING_DAMAGE_BOX_INFO, SHIELD_BLOCKING_LIMB_STATE, TRIBESMAN_RESTING_LIMB_STATE } from "battletribes-shared/attack-patterns";
import { registerDirtyEntity } from "../server/player-clients";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { HealthComponentArray } from "./HealthComponent";
import { attemptAttack, calculateItemKnockback } from "../entities/tribes/limb-use";
import Board from "../Board";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { applyKnockback } from "./PhysicsComponent";

export interface InventoryUseComponentParams {
   usedInventoryNames: Array<InventoryName>;
}

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
   
   /** Damage box used to create limb attacks. */
   limbDamageBox: ServerDamageBox;
   heldItemDamageBox: ServerDamageBox;
   blockBox: ServerBlockBox;

   // @Hack @Memory: Shouldn't be stored like this, should only be sent when block events happen
   // @Bug: If multiple attacks are blocked in 1 tick by the same damage box, only one of them is sent. 
   lastBlockTick: number;
   blockPositionX: number;
   blockPositionY: number;
   blockType: BlockType;
}

const addLimbStateToPacket = (packet: Packet, limbState: LimbState): void => {
   packet.addNumber(limbState.direction);
   packet.addNumber(limbState.extraOffset);
   packet.addNumber(limbState.rotation);
   packet.addNumber(limbState.extraOffsetX);
   packet.addNumber(limbState.extraOffsetY);
}

export class InventoryUseComponent {
   public readonly associatedInventoryNames = new Array<InventoryName>();
   
   public readonly limbInfos = new Array<LimbInfo>();
   private readonly inventoryUseInfoRecord: Partial<Record<InventoryName, LimbInfo>> = {};

   public globalAttackCooldown = 0;

   public createLimb(entity: EntityID, associatedInventory: Inventory): void {
      const limbDamageBox = new ServerDamageBox(new CircularBox(new Point(0, 0), 0, 12), associatedInventory.name, false);
      const heldItemDamageBox = new ServerDamageBox(new RectangularBox(new Point(0, 0), 0, 0, 0), associatedInventory.name, false);
      const blockBox = new ServerBlockBox(new RectangularBox(new Point(0, 0), 0, 0, 0), associatedInventory.name, false);
      
      const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
      damageBoxComponent.addDamageBox(limbDamageBox);
      damageBoxComponent.addDamageBox(heldItemDamageBox);
      damageBoxComponent.addBlockBox(blockBox);

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
         currentActionStartLimbState: copyLimbState(TRIBESMAN_RESTING_LIMB_STATE),
         currentActionEndLimbState: copyLimbState(TRIBESMAN_RESTING_LIMB_STATE),
         limbDamageBox: limbDamageBox,
         heldItemDamageBox: heldItemDamageBox,
         blockBox: blockBox,
         lastBlockTick: 0,
         blockPositionX: 0,
         blockPositionY: 0,
         blockType: BlockType.partial
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

   constructor(params: InventoryUseComponentParams) {
      for (let i = 0; i < params.usedInventoryNames.length; i++) {
         const inventoryName = params.usedInventoryNames[i];
         this.associatedInventoryNames.push(inventoryName);
      }
   }
}

export const InventoryUseComponentArray = new ComponentArray<InventoryUseComponent>(ServerComponentType.inventoryUse, true, {
   onJoin: onJoin,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onJoin(entity: EntityID): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   
   for (let i = 0; i < inventoryUseComponent.associatedInventoryNames.length; i++) {
      const inventoryName = inventoryUseComponent.associatedInventoryNames[i];
      const inventory = getInventory(inventoryComponent, inventoryName);

      inventoryUseComponent.createLimb(entity, inventory);
   }
}

const currentActionHasFinished = (limbInfo: LimbInfo): boolean => {
   return limbInfo.currentActionElapsedTicks >= limbInfo.currentActionDurationTicks;
}

// @Cleanup: remove once proper method is made
// @Cleanup: also make getHeldItemAttackInfo method
export function getHeldItem(limbInfo: LimbInfo): Item | null {
   const item = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
   return typeof item !== "undefined" ? item : null;
}

const setLimb = (entity: EntityID, limb: LimbInfo, limbDirection: number, extraOffset: number, limbRotation: number, extraOffsetX: number, extraOffsetY: number): void => {
   const limbDamageBox = limb.limbDamageBox;

   // @Temporary @Hack
   const offset = extraOffset + 34;

   const limbBox = limbDamageBox.box;
   limbBox.offset.x = offset * Math.sin(limbDirection) + extraOffsetX;
   limbBox.offset.y = offset * Math.cos(limbDirection) + extraOffsetY;
   limbBox.relativeRotation = limbRotation;

   // Update limb
   const transformComponent = TransformComponentArray.getComponent(entity);
   updateBox(limbBox, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);

   if (limb.heldItemDamageBox.isActive) {
      updateBox(limb.heldItemDamageBox.box, limbBox.position.x, limbBox.position.y, limbBox.rotation);
   }
   if (limb.blockBox.isActive) {
      updateBox(limb.blockBox.box, limbBox.position.x, limbBox.position.y, limbBox.rotation);
   }
}

const lerpLimbBetweenStates = (entity: EntityID, limbInfo: LimbInfo, startingLimbState: LimbState, targetLimbState: LimbState, progress: number): void => {
   const direction = lerp(startingLimbState.direction, targetLimbState.direction, progress);
   const extraOffset = lerp(startingLimbState.extraOffset, targetLimbState.extraOffset, progress);
   const rotation = lerp(startingLimbState.rotation, targetLimbState.rotation, progress);
   const extraOffsetX = lerp(startingLimbState.extraOffsetX, targetLimbState.extraOffsetX, progress);
   const extraOffsetY = lerp(startingLimbState.extraOffsetY, targetLimbState.extraOffsetY, progress);
   setLimb(entity, limbInfo, direction, extraOffset, rotation, extraOffsetX, extraOffsetY);
}

const setLimbToState = (entity: EntityID, limbInfo: LimbInfo, state: LimbState): void => {
   setLimb(entity, limbInfo, state.direction, state.extraOffset, state.rotation, state.extraOffsetX, state.extraOffsetY);
}

export function onBlockBoxCollisionWithDamageBox(attacker: EntityID, victim: EntityID, blockBoxLimb: LimbInfo, blockBox: ServerBlockBox, collidingDamageBox: ServerDamageBox): void {
   const victimInventoryUseComponent = InventoryUseComponentArray.getComponent(attacker);
   const attackerLimb = victimInventoryUseComponent.getLimbInfo(collidingDamageBox.associatedLimbInventoryName);

   // Pause the attack for a brief period
   attackerLimb.currentActionPauseTicksRemaining = Math.floor(Settings.TPS / 15);
   attackerLimb.currentActionRate = 0.4;

   attackerLimb.limbDamageBox.isBlocked = true;
   attackerLimb.heldItemDamageBox.isBlocked = true;
   // If the attack is blocked fully, just deactivate the attack boxes
   if (blockBox.blockType === BlockType.full) {
      attackerLimb.limbDamageBox.isActive = false;
      attackerLimb.heldItemDamageBox.isActive = false;

      const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
      const victimTransformComponent = TransformComponentArray.getComponent(victim);
      // Push back
      const pushDirection = attackerTransformComponent.position.calculateAngleBetween(victimTransformComponent.position);
      const attackingItem = getHeldItem(attackerLimb);
      const knockbackAmount = calculateItemKnockback(attackingItem, true);
      applyKnockback(victim, knockbackAmount, pushDirection);
   }

   blockBox.hasBlocked = true;

   // @Copynpaste
   blockBoxLimb.lastBlockTick = Board.ticks;
   blockBoxLimb.blockPositionX = blockBox.box.position.x;
   blockBoxLimb.blockPositionY = blockBox.box.position.y;
   blockBoxLimb.blockType = blockBox.blockType;
   registerDirtyEntity(attacker);
}

export function onBlockBoxCollisionWithProjectile(blockingEntity: EntityID, projectile: EntityID, blockBoxLimb: LimbInfo, blockBox: ServerBlockBox): void {
   blockBox.hasBlocked = true;
   // @Copynpaste
   blockBoxLimb.lastBlockTick = Board.ticks;
   blockBoxLimb.blockPositionX = blockBox.box.position.x;
   blockBoxLimb.blockPositionY = blockBox.box.position.y;
   blockBoxLimb.blockType = blockBox.blockType;

   if (blockBox.blockType === BlockType.full) {
      const blockingEntityTransformComponent = TransformComponentArray.getComponent(blockingEntity);
      const projectileTransformComponent = TransformComponentArray.getComponent(projectile);
      
      // Push back
      const pushDirection = projectileTransformComponent.position.calculateAngleBetween(blockingEntityTransformComponent.position);
      // @Hack @Hardcoded: knockback amount
      applyKnockback(blockingEntity, 75, pushDirection);
      
      Board.destroyEntity(projectile);
   } else {
      const projectileComponent = ProjectileComponentArray.getComponent(projectile);
      projectileComponent.isBlocked = true;
   }
}

export function onDamageBoxCollision(attacker: EntityID, victim: EntityID, limb: LimbInfo): void {
   // Attack the entity
   if (HealthComponentArray.hasComponent(victim)) {
      // Deactivate the damage boxes
      limb.limbDamageBox.isActive = false;
      limb.heldItemDamageBox.isActive = false;
      
      attemptAttack(attacker, victim, limb);
   }
}

function onTick(inventoryUseComponent: InventoryUseComponent, entity: EntityID): void {
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

      if (limb.currentActionPauseTicksRemaining > 0) {
         limb.currentActionPauseTicksRemaining--;
      } else {
         limb.currentActionElapsedTicks += limb.currentActionRate;
      }
      
      if (currentActionHasFinished(limb)) {
         switch (limb.action) {
            case LimbAction.engageBlock: {
               const heldItem = getHeldItem(limb);

               limb.limbDamageBox.isActive = false;
               limb.blockBox.isActive = true;
               limb.blockBox.blockType = heldItem !== null && ITEM_TYPE_RECORD[heldItem.type] === "shield" ? BlockType.full : BlockType.partial;

               const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
               const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo!;
               
               // @Copynpaste
               assertBoxIsRectangular(limb.blockBox.box);
               limb.blockBox.box.offset.x = damageBoxInfo.offsetX;
               limb.blockBox.box.offset.y = damageBoxInfo.offsetY;
               limb.blockBox.box.width = damageBoxInfo.width;
               limb.blockBox.box.height = damageBoxInfo.height;
               limb.blockBox.box.relativeRotation = damageBoxInfo.rotation;

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
               applyKnockback(entity, 250, transformComponent.rotation);
               console.log("apply");

               limb.blockBox.isActive = false;
               
               limb.limbDamageBox.isActive = true;
               limb.limbDamageBox.isBlocked = false;
               limb.heldItemDamageBox.isActive = true;
               limb.heldItemDamageBox.isBlocked = false;

               const damageBoxInfo = SHIELD_BLOCKING_DAMAGE_BOX_INFO;

               // @Copynpaste
               assertBoxIsRectangular(limb.heldItemDamageBox.box);
               limb.heldItemDamageBox.box.offset.x = damageBoxInfo.offsetX;
               limb.heldItemDamageBox.box.offset.y = damageBoxInfo.offsetY;
               limb.heldItemDamageBox.box.width = damageBoxInfo.width;
               limb.heldItemDamageBox.box.height = damageBoxInfo.height;
               limb.heldItemDamageBox.box.relativeRotation = damageBoxInfo.rotation;
               break;
            }
            case LimbAction.pushShieldBash: {
               limb.action = LimbAction.returnShieldBashToRest;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_RETURN_TIME_TICKS;

               limb.limbDamageBox.isActive = false;
               limb.heldItemDamageBox.isActive = false;
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
               
               limb.action = LimbAction.attack;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.swingTimeTicks;
               // @Speed: Garbage collection
               limb.currentActionStartLimbState = copyLimbState(heldItemAttackInfo.attackPattern!.windedBack);
               // @Speed: Garbage collection
               limb.currentActionEndLimbState = copyLimbState(heldItemAttackInfo.attackPattern!.swung);
               
               limb.limbDamageBox.isActive = true;
               limb.limbDamageBox.isBlocked = false;
               limb.heldItemDamageBox.isBlocked = false;

               const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo;
               if (damageBoxInfo !== null) {
                  limb.heldItemDamageBox.isActive = true;

                  // @Copynpaste
                  assertBoxIsRectangular(limb.heldItemDamageBox.box);
                  limb.heldItemDamageBox.box.offset.x = damageBoxInfo.offsetX;
                  limb.heldItemDamageBox.box.offset.y = damageBoxInfo.offsetY;
                  limb.heldItemDamageBox.box.width = damageBoxInfo.width;
                  limb.heldItemDamageBox.box.height = damageBoxInfo.height;
                  limb.heldItemDamageBox.box.relativeRotation = damageBoxInfo.rotation;
               } else {
                  limb.heldItemDamageBox.isActive = false;
               }
               break;
            }
            case LimbAction.attack: {
               const heldItem = getHeldItem(limb);
               const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);

               limb.action = LimbAction.returnAttackToRest;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.returnTimeTicks;
               // @Speed: Garbage collection
               limb.currentActionStartLimbState = copyLimbState(heldItemAttackInfo.attackPattern!.swung);
               // @Speed: Garbage collection
               limb.currentActionEndLimbState = copyLimbState(TRIBESMAN_RESTING_LIMB_STATE);

               limb.limbDamageBox.isActive = false;
               limb.heldItemDamageBox.isActive = false;
               break;
            }
            case LimbAction.returnAttackToRest: {
               limb.action = LimbAction.none;
               break;
            }
            case LimbAction.returnBlockToRest: {
               limb.action = LimbAction.none;
               break;
            }
         }
      }

      // Update damage box for limb attacks
      if (limb.action === LimbAction.attack) {
         const swingProgress = limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
         lerpLimbBetweenStates(entity, limb, limb.currentActionStartLimbState, limb.currentActionEndLimbState, swingProgress);
      }
      // @Copynpaste
      // Update damage box for shield bashes
      if (limb.action === LimbAction.pushShieldBash) {
         const swingProgress = limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
         lerpLimbBetweenStates(entity, limb, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BASH_PUSHED_LIMB_STATE, swingProgress);
      }

      // Update blocking damage box when blocking
      if (limb.action === LimbAction.block) {
         if (limb.currentActionElapsedTicks >= limb.currentActionDurationTicks) {
            const heldItem = getHeldItem(limb);
            const blockingState = heldItem !== null && ITEM_TYPE_RECORD[heldItem.type] === "shield" ? SHIELD_BLOCKING_LIMB_STATE : BLOCKING_LIMB_STATE;
            setLimbToState(entity, limb, blockingState);
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
   packet.addNumber(crossbowLoadProgressEntries.length);
   for (let i = 0; i < crossbowLoadProgressEntries.length; i++) {
      const [itemSlot, cooldown] = crossbowLoadProgressEntries[i];
      packet.addNumber(itemSlot);
      packet.addNumber(cooldown);
   }
}

function getDataLength(entity: EntityID): number {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   let lengthBytes = 2 * Float32Array.BYTES_PER_ELEMENT;
   for (const useInfo of inventoryUseComponent.limbInfos) {
      lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * Object.keys(useInfo.spearWindupCooldowns).length;
      lengthBytes += getCrossbowLoadProgressRecordLength(useInfo);
      lengthBytes += 19 * Float32Array.BYTES_PER_ELEMENT;
      // Limb states
      lengthBytes += 2 * 5 * Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   packet.addNumber(inventoryUseComponent.limbInfos.length);
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limb = inventoryUseComponent.limbInfos[i];

      packet.addNumber(limb.associatedInventory.name);
      packet.addNumber(limb.selectedItemSlot);
      packet.addNumber(limb.associatedInventory.itemSlots[limb.selectedItemSlot]?.type || -1)

      // @Cleanup: Copy and paste
      const spearWindupCooldownEntries = Object.entries(limb.spearWindupCooldowns).map(([a, b]) => [Number(a), b]) as Array<[number, number]>;
      packet.addNumber(spearWindupCooldownEntries.length);
      for (let i = 0; i < spearWindupCooldownEntries.length; i++) {
         const [itemSlot, cooldown] = spearWindupCooldownEntries[i];
         packet.addNumber(itemSlot);
         packet.addNumber(cooldown);
      }

      addCrossbowLoadProgressRecordToPacket(packet, limb);

      packet.addNumber(limb.foodEatingTimer);
      packet.addNumber(limb.action);
      packet.addNumber(limb.lastAttackTicks);
      packet.addNumber(limb.lastEatTicks);
      packet.addNumber(limb.lastBowChargeTicks);
      packet.addNumber(limb.lastSpearChargeTicks);
      packet.addNumber(limb.lastBattleaxeChargeTicks);
      packet.addNumber(limb.lastCrossbowLoadTicks);
      packet.addNumber(limb.lastCraftTicks);
      packet.addNumber(limb.thrownBattleaxeItemID);
      packet.addNumber(limb.lastAttackCooldown);
      packet.addNumber(limb.currentActionElapsedTicks);
      packet.addNumber(limb.currentActionDurationTicks);
      packet.addNumber(limb.currentActionPauseTicksRemaining);
      packet.addNumber(limb.currentActionRate);
      packet.addNumber(limb.lastBlockTick);
      packet.addNumber(limb.blockPositionX);
      packet.addNumber(limb.blockPositionY);
      packet.addNumber(limb.blockType);

      addLimbStateToPacket(packet, limb.currentActionStartLimbState);
      addLimbStateToPacket(packet, limb.currentActionEndLimbState);
   }
}

export function setLimbActions(inventoryUseComponent: InventoryUseComponent, limbAction: LimbAction): void {
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];
      limbInfo.action = limbAction;
   }
}