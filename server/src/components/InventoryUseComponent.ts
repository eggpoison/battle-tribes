import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, LimbAction } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { ComponentArray } from "./ComponentArray";
import { Inventory, InventoryName, ITEM_INFO_RECORD, itemInfoIsTool, ItemVars } from "webgl-test-shared/dist/items/items";
import { Packet } from "webgl-test-shared/dist/packets";
import Board from "../Board";
import { getInventory, InventoryComponentArray } from "./InventoryComponent";
import CircularBox from "webgl-test-shared/dist/boxes/CircularBox";
import { lerp, Point } from "webgl-test-shared/dist/utils";
import { DamageBoxComponentArray } from "./DamageBoxComponent";
import { createDamageBox, ServerDamageBoxWrapper } from "../boxes";
import { updateBox } from "webgl-test-shared/dist/boxes/boxes";
import { TransformComponentArray } from "./TransformComponent";
import { DEFAULT_ATTACK_PATTERN, LimbState } from "webgl-test-shared/dist/attack-patterns";
import { registerDirtyEntity } from "../server/player-clients";

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
   currentActionStartingTicks: number;
   /** Expected duration of the current action in ticks */
   currentActionDurationTicks: number;

   /** Damage box used to create limb attacks. */
   damageBox: WeakRef<ServerDamageBoxWrapper> | null;
}

export class InventoryUseComponent {
   public readonly associatedInventoryNames = new Array<InventoryName>();
   
   public readonly limbInfos = new Array<LimbInfo>();
   private readonly inventoryUseInfoRecord: Partial<Record<InventoryName, LimbInfo>> = {};

   public globalAttackCooldown = 0;

   public addInventoryUseInfo(associatedInventory: Inventory): void {
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
         currentActionStartingTicks: 0,
         currentActionDurationTicks: 0,
         damageBox: null
      };
      
      this.limbInfos.push(useInfo);
      this.inventoryUseInfoRecord[associatedInventory.name] = useInfo;
   }

   public getUseInfo(inventoryName: InventoryName): LimbInfo {
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

      inventoryUseComponent.addInventoryUseInfo(inventory);
   }
}

const currentActionHasFinished = (limbInfo: LimbInfo): boolean => {
   const ticksSince = Board.ticks - limbInfo.currentActionStartingTicks;
   return ticksSince >= limbInfo.currentActionDurationTicks;
}

const getSwingTimeTicks = (limbInfo: LimbInfo): number => {
   const item = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];

   if (typeof item !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[item.type];
      if (itemInfoIsTool(item.type, itemInfo)) {
         return itemInfo.attackSwingTimeTicks;
      }
   }

   return ItemVars.DEFAULT_ATTACK_SWING_TICKS;
}

// @Copynpaste @Cleanup: Copynpaste
const getReturnTimeTicks = (limbInfo: LimbInfo): number => {
   const item = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
   if (typeof item !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[item.type];
      if (itemInfoIsTool(item.type, itemInfo)) {
         return itemInfo.attackReturnTimeTicks;
      }
   }

   return ItemVars.DEFAULT_ATTACK_RETURN_TICKS;
}

const updateLimb = (entity: EntityID, limbInfo: LimbInfo, startingLimbState: LimbState, targetLimbState: LimbState, progress: number): void => {
   if (limbInfo.damageBox === null) {
      throw new Error();
   }

   const damageBox = limbInfo.damageBox.deref();
   if (typeof damageBox === "undefined") {
      throw new Error();
   }

   const direction = lerp(startingLimbState.direction, targetLimbState.direction, progress);
   const extraOffset = lerp(startingLimbState.extraOffset, targetLimbState.extraOffset, progress);
   // @Temporary @Hack
   const offset = extraOffset + 34;

   const box = damageBox.box;
   box.offset.x = offset * Math.sin(direction);
   box.offset.y = offset * Math.cos(direction);

   const transformComponent = TransformComponentArray.getComponent(entity);
   updateBox(box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);
}

function onTick(inventoryUseComponent: InventoryUseComponent, entity: EntityID): void {
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      inventoryUseComponent.globalAttackCooldown--;
   }

   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];

      // Certain actions should always show an update for the player
      if (limbInfo.action === LimbAction.windAttack || limbInfo.action === LimbAction.attack || limbInfo.action === LimbAction.returnAttackToRest) {
         registerDirtyEntity(entity);
      }
      
      if (currentActionHasFinished(limbInfo)) {
         switch (limbInfo.action) {
            case LimbAction.windAttack: {
               limbInfo.action = LimbAction.attack;
               limbInfo.currentActionStartingTicks = Board.ticks;
               limbInfo.currentActionDurationTicks = getSwingTimeTicks(limbInfo);

               if (limbInfo.damageBox === null) {
                  const box = new CircularBox(new Point(0, 0), 16);
                  const damageBox = createDamageBox(box, limbInfo);
                  
                  const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
                  damageBoxComponent.addDamageBox(damageBox);

                  limbInfo.damageBox = new WeakRef(damageBox);
               }
               break;
            }
            case LimbAction.attack: {
               limbInfo.action = LimbAction.returnAttackToRest;
               limbInfo.currentActionStartingTicks = Board.ticks;
               limbInfo.currentActionDurationTicks = getReturnTimeTicks(limbInfo);

               const damageBox = limbInfo.damageBox?.deref();
               if (typeof damageBox !== "undefined") {
                  const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
                  damageBoxComponent.removeDamageBox(damageBox);
               }
               limbInfo.damageBox = null;
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
         const ticksSince = Board.ticks - limbInfo.currentActionStartingTicks;
         const swingProgress = ticksSince / limbInfo.currentActionDurationTicks;

         updateLimb(entity, limbInfo, DEFAULT_ATTACK_PATTERN.windedBack, DEFAULT_ATTACK_PATTERN.swung, swingProgress);
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
      lengthBytes += 13 * Float32Array.BYTES_PER_ELEMENT;
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
      packet.addNumber(limbInfo.currentActionStartingTicks);
      packet.addNumber(limbInfo.currentActionDurationTicks);
   }
}

export function setLimbActions(inventoryUseComponent: InventoryUseComponent, limbAction: LimbAction): void {
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];
      limbInfo.action = limbAction;
   }
}