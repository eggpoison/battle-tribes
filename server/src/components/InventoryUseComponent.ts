import { DamageBoxType, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, LimbAction } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { ComponentArray } from "./ComponentArray";
import { getItemAttackInfo, Inventory, InventoryName, Item } from "webgl-test-shared/dist/items/items";
import { Packet } from "webgl-test-shared/dist/packets";
import { getInventory, InventoryComponentArray } from "./InventoryComponent";
import CircularBox from "webgl-test-shared/dist/boxes/CircularBox";
import { lerp, Point } from "webgl-test-shared/dist/utils";
import { DamageBoxComponentArray } from "./DamageBoxComponent";
import { createDamageBox, ServerDamageBoxWrapper } from "../boxes";
import { updateBox } from "webgl-test-shared/dist/boxes/boxes";
import { TransformComponentArray } from "./TransformComponent";
import { BLOCKING_LIMB_STATE, LimbState } from "webgl-test-shared/dist/attack-patterns";
import { registerDirtyEntity } from "../server/player-clients";
import RectangularBox from "webgl-test-shared/dist/boxes/RectangularBox";
import { HealthComponentArray } from "./HealthComponent";
import { attemptAttack } from "../entities/tribes/limb-use";
import Board from "../Board";

export interface InventoryUseComponentParams {
   usedInventoryNames: Array<InventoryName>;
}

// @Cleanup: Make into class Limb with getHeldItem method
export interface LimbInfo {
   readonly associatedInventory: Inventory;
   selectedItemSlot: number;
   bowCooldownTicks: number;
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

   /** Damage box used to create limb attacks. */
   limbDamageBox: ServerDamageBoxWrapper;
   heldItemDamageBox: WeakRef<ServerDamageBoxWrapper> | null;
   blockingDamageBox: WeakRef<ServerDamageBoxWrapper> | null;

   // @Bug: If multiple attacks are blocked in 1 tick by the same damage box, only one of them is sent. 
   lastBlockTick: number;
   blockPositionX: number;
   blockPositionY: number;
}

export class InventoryUseComponent {
   public readonly associatedInventoryNames = new Array<InventoryName>();
   
   public readonly limbInfos = new Array<LimbInfo>();
   private readonly inventoryUseInfoRecord: Partial<Record<InventoryName, LimbInfo>> = {};

   public globalAttackCooldown = 0;

   public createLimb(entity: EntityID, associatedInventory: Inventory): void {
      // Create limb damage box

      const box = new CircularBox(new Point(0, 0), 0, 12);
      const damageBox = createDamageBox(box, associatedInventory.name, {
         onCollision: onLimbAttackBoxCollision,
         onCollisionEnter: onLimbAttackBoxCollisionEnter
      }, false, DamageBoxType.attacking);
      damageBox.isActive = false;
      
      const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
      damageBoxComponent.addDamageBox(damageBox);

      const useInfo: LimbInfo = {
         associatedInventory: associatedInventory,
         selectedItemSlot: 1,
         bowCooldownTicks: 0,
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
         limbDamageBox: damageBox,
         heldItemDamageBox: null,
         blockingDamageBox: null,
         lastBlockTick: 0,
         blockPositionX: 0,
         blockPositionY: 0
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
export function getHeldItem(limbInfo: LimbInfo): Item | null {
   const item = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
   return typeof item !== "undefined" ? item : null;
}

const setLimb = (entity: EntityID, limbInfo: LimbInfo, limbDirection: number, extraOffset: number, limbRotation: number): void => {
   const limbDamageBox = limbInfo.limbDamageBox;

   // @Temporary @Hack
   const offset = extraOffset + 34;

   const limbBox = limbDamageBox.box;
   limbBox.offset.x = offset * Math.sin(limbDirection);
   limbBox.offset.y = offset * Math.cos(limbDirection);
   limbBox.relativeRotation = limbRotation;

   const transformComponent = TransformComponentArray.getComponent(entity);
   updateBox(limbBox, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);

   const heldItemDamageBox = limbInfo.heldItemDamageBox?.deref();
   if (typeof heldItemDamageBox !== "undefined") {
      updateBox(heldItemDamageBox.box, limbBox.position.x, limbBox.position.y, limbBox.rotation);
   }

   const blockingDamageBox = limbInfo.blockingDamageBox?.deref();
   if (typeof blockingDamageBox !== "undefined") {
      updateBox(blockingDamageBox.box, limbBox.position.x, limbBox.position.y, limbBox.rotation);
   }
}

const lerpLimbBetweenStates = (entity: EntityID, limbInfo: LimbInfo, startingLimbState: LimbState, targetLimbState: LimbState, progress: number): void => {
   const direction = lerp(startingLimbState.direction, targetLimbState.direction, progress);
   const extraOffset = lerp(startingLimbState.extraOffset, targetLimbState.extraOffset, progress);
   const rotation = lerp(startingLimbState.rotation, targetLimbState.rotation, progress);
   setLimb(entity, limbInfo, direction, extraOffset, rotation);
}

const setLimbToState = (entity: EntityID, limbInfo: LimbInfo, state: LimbState): void => {
   setLimb(entity, limbInfo, state.direction, state.extraOffset, state.rotation);
}

const onLimbAttackBoxCollisionEnter = (attacker: EntityID, victim: EntityID, attackingLimb: LimbInfo, collidingDamageBox: ServerDamageBoxWrapper | null): void => {
   // Attack is blocked if the wrapper is a damage box
   if (collidingDamageBox !== null) {
      console.log("attack bocked!",Math.random());
      // Pause the attack for a brief period
      attackingLimb.currentActionPauseTicksRemaining = Math.floor(Settings.TPS / 15);
      attackingLimb.currentActionRate = 0.4;

      const victimInventoryUseComponent = InventoryUseComponentArray.getComponent(victim);
      const associatedLimb = victimInventoryUseComponent.getLimbInfo(collidingDamageBox.associatedLimbInventoryName);
      associatedLimb.lastBlockTick = Board.ticks;
      associatedLimb.blockPositionX = collidingDamageBox.box.position.x;
      associatedLimb.blockPositionY = collidingDamageBox.box.position.y;
      registerDirtyEntity(victim);
   }
}

const onLimbAttackBoxCollision = (attacker: EntityID, victim: EntityID, limb: LimbInfo, collidingDamageBox: ServerDamageBoxWrapper | null): void => {
   // If the collision is with a damage box, don't try to hurt the entity
   if (collidingDamageBox !== null) {
      return;
   }
   
   const damageBoxComponent = DamageBoxComponentArray.getComponent(attacker);
   
   // Attack the entity
   if (HealthComponentArray.hasComponent(victim)) {
      // @Hack @Incomplete: shouldn't work for offhand
      // Remove all damage boxes
      for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
         const damageBox = damageBoxComponent.damageBoxes[i];
         if (damageBox.isTemporary) {
            damageBox.isRemoved = true;
         } else {
            damageBox.isActive = false;
         }
      }
      
      attemptAttack(attacker, victim, limb);
   }
}

function onTick(inventoryUseComponent: InventoryUseComponent, entity: EntityID): void {
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      inventoryUseComponent.globalAttackCooldown--;
   }

   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];

      // @Cleanup: When blocking, once the block is finished going up the entity should no longer be dirtied by this
      // Certain actions should always show an update for the player
      if (limbInfo.action === LimbAction.windAttack || limbInfo.action === LimbAction.attack || limbInfo.action === LimbAction.returnAttackToRest || limbInfo.action === LimbAction.block) {
         registerDirtyEntity(entity);
      }

      if (limbInfo.currentActionPauseTicksRemaining > 0) {
         limbInfo.currentActionPauseTicksRemaining--;
      } else {
         limbInfo.currentActionElapsedTicks += limbInfo.currentActionRate;
      }
      
      if (currentActionHasFinished(limbInfo)) {
         switch (limbInfo.action) {
            case LimbAction.block: {
               // Create blocking damage box
               // Since the block action continues even past when its animation finishes, we have to do this check
               const existingDamageBox = limbInfo.blockingDamageBox?.deref();
               if (typeof existingDamageBox === "undefined") {
                  const heldItem = getHeldItem(limbInfo);
                  const heldItemAttackInfo = getItemAttackInfo(heldItem);
                  const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo!;
                  
                  // @Copynpaste
                  const box = new RectangularBox(new Point(damageBoxInfo.offsetX, damageBoxInfo.offsetY), damageBoxInfo.width, damageBoxInfo.height, damageBoxInfo.rotation);
                  const damageBox = createDamageBox(box, limbInfo.associatedInventory.name, {}, true, DamageBoxType.blocking);
                  
                  const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
                  damageBoxComponent.addDamageBox(damageBox);
                  
                  limbInfo.blockingDamageBox = new WeakRef(damageBox);
               }
                  
               break;
            }
            case LimbAction.windAttack: {
               const heldItem = getHeldItem(limbInfo);
               const heldItemAttackInfo = getItemAttackInfo(heldItem);
               
               limbInfo.action = LimbAction.attack;
               limbInfo.currentActionElapsedTicks = 0;
               limbInfo.currentActionDurationTicks = heldItemAttackInfo.attackTimings.swingTimeTicks;
               limbInfo.limbDamageBox.isActive = true;

               if (limbInfo.heldItemDamageBox !== null) {
                  throw new Error();
               }

               // Create held item damage box
               const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo;
               if (damageBoxInfo !== null) {
                  const box = new RectangularBox(new Point(damageBoxInfo.offsetX, damageBoxInfo.offsetY), damageBoxInfo.width, damageBoxInfo.height, damageBoxInfo.rotation);
                  const damageBox = createDamageBox(box, limbInfo.associatedInventory.name, {
                     onCollision: onLimbAttackBoxCollision,
                     onCollisionEnter: onLimbAttackBoxCollisionEnter
                  }, true, DamageBoxType.attacking);
                  
                  const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
                  damageBoxComponent.addDamageBox(damageBox);
   
                  limbInfo.heldItemDamageBox = new WeakRef(damageBox);
               }
               break;
            }
            case LimbAction.attack: {
               const heldItem = getHeldItem(limbInfo);
               const heldItemAttackInfo = getItemAttackInfo(heldItem);

               limbInfo.action = LimbAction.returnAttackToRest;
               limbInfo.currentActionElapsedTicks = 0;
               limbInfo.currentActionDurationTicks = heldItemAttackInfo.attackTimings.returnTimeTicks;
               limbInfo.limbDamageBox.isActive = false;

               const heldItemDamageBox = limbInfo.heldItemDamageBox?.deref();
               if (typeof heldItemDamageBox !== "undefined") {
                  const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
                  damageBoxComponent.removeDamageBox(heldItemDamageBox);
               }
               limbInfo.heldItemDamageBox = null;
               break;
            }
            case LimbAction.returnAttackToRest: {
               limbInfo.action = LimbAction.none;
               break;
            }
         }
      }

      // Update damage box for limb attacks
      if (limbInfo.action === LimbAction.attack) {
         const swingProgress = limbInfo.currentActionElapsedTicks / limbInfo.currentActionDurationTicks;

         const heldItem = getHeldItem(limbInfo);
         const attackInfo = getItemAttackInfo(heldItem);
         lerpLimbBetweenStates(entity, limbInfo, attackInfo.attackPattern.windedBack, attackInfo.attackPattern.swung, swingProgress);
      }

      // Update blocking damage box when blocking
      if (limbInfo.action === LimbAction.block) {
         if (limbInfo.currentActionElapsedTicks >= limbInfo.currentActionDurationTicks) {
            limbInfo.limbDamageBox.isActive = false;
            setLimbToState(entity, limbInfo, BLOCKING_LIMB_STATE);
         }
      }
      
      // Update bow cooldown
      if (limbInfo.bowCooldownTicks > 0) {
         limbInfo.bowCooldownTicks--;
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
      lengthBytes += 18 * Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   packet.addNumber(inventoryUseComponent.limbInfos.length);
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];

      packet.addNumber(limbInfo.associatedInventory.name);
      packet.addNumber(limbInfo.selectedItemSlot);
      packet.addNumber(limbInfo.bowCooldownTicks);

      // @Cleanup: Copy and paste
      const spearWindupCooldownEntries = Object.entries(limbInfo.spearWindupCooldowns).map(([a, b]) => [Number(a), b]) as Array<[number, number]>;
      packet.addNumber(spearWindupCooldownEntries.length);
      for (let i = 0; i < spearWindupCooldownEntries.length; i++) {
         const [itemSlot, cooldown] = spearWindupCooldownEntries[i];
         packet.addNumber(itemSlot);
         packet.addNumber(cooldown);
      }

      addCrossbowLoadProgressRecordToPacket(packet, limbInfo);

      packet.addNumber(limbInfo.foodEatingTimer);
      packet.addNumber(limbInfo.action);
      packet.addNumber(limbInfo.lastAttackTicks);
      packet.addNumber(limbInfo.lastEatTicks);
      packet.addNumber(limbInfo.lastBowChargeTicks);
      packet.addNumber(limbInfo.lastSpearChargeTicks);
      packet.addNumber(limbInfo.lastBattleaxeChargeTicks);
      packet.addNumber(limbInfo.lastCrossbowLoadTicks);
      packet.addNumber(limbInfo.lastCraftTicks);
      packet.addNumber(limbInfo.thrownBattleaxeItemID);
      packet.addNumber(limbInfo.lastAttackCooldown);
      packet.addNumber(limbInfo.currentActionElapsedTicks);
      packet.addNumber(limbInfo.currentActionDurationTicks);
      packet.addNumber(limbInfo.currentActionPauseTicksRemaining);
      packet.addNumber(limbInfo.currentActionRate);
      packet.addNumber(limbInfo.lastBlockTick);
      packet.addNumber(limbInfo.blockPositionX);
      packet.addNumber(limbInfo.blockPositionY);
   }
}

export function setLimbActions(inventoryUseComponent: InventoryUseComponent, limbAction: LimbAction): void {
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];
      limbInfo.action = limbAction;
   }
}