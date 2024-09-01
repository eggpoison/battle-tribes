import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, LimbAction } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { ComponentArray } from "./ComponentArray";
import { InventoryName } from "webgl-test-shared/dist/items/items";
import { getInventory, InventoryComponentArray } from "./InventoryComponent";
import { Packet } from "webgl-test-shared/dist/packets";

export interface InventoryUseComponentParams {
   usedInventoryNames: Array<InventoryName>;
}

export interface InventoryUseInfo {
   readonly usedInventoryName: InventoryName;
   selectedItemSlot: number;
   bowCooldownTicks: number;
   readonly itemAttackCooldowns: Partial<Record<number, number>>;
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
   thrownBattleaxeItemID: number;
   lastAttackCooldown: number;

   /** Artificial cooldown added to tribesmen to make them a bit worse at combat */
   extraAttackCooldownTicks: number;
}

export class InventoryUseComponent {
   public readonly inventoryUseInfos = new Array<InventoryUseInfo>();
   private readonly inventoryUseInfoRecord: Partial<Record<InventoryName, InventoryUseInfo>> = {};

   public globalAttackCooldown = 0;

   public addInventoryUseInfo(inventoryName: InventoryName): void {
      const useInfo: InventoryUseInfo = {
         usedInventoryName: inventoryName,
         selectedItemSlot: 1,
         bowCooldownTicks: 0,
         itemAttackCooldowns: {},
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
         thrownBattleaxeItemID: -1,
         lastAttackCooldown: Settings.DEFAULT_ATTACK_COOLDOWN,
         lastCraftTicks: 0,
         extraAttackCooldownTicks: 0
      };
      
      this.inventoryUseInfos.push(useInfo);
      this.inventoryUseInfoRecord[inventoryName] = useInfo;
   }

   public getUseInfo(inventoryName: InventoryName): InventoryUseInfo {
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
         this.addInventoryUseInfo(inventoryName);
      }
   }
}

export const InventoryUseComponentArray = new ComponentArray<InventoryUseComponent>(ServerComponentType.inventoryUse, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(inventoryUseComponent: InventoryUseComponent, entity: EntityID): void {
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      inventoryUseComponent.globalAttackCooldown--;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   
   for (let i = 0; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
      const useInfo = inventoryUseComponent.inventoryUseInfos[i];

      const inventory = getInventory(inventoryComponent, useInfo.usedInventoryName);

      // Update attack cooldowns
      for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
         if (typeof useInfo.itemAttackCooldowns[itemSlot] !== "undefined") {
            useInfo.itemAttackCooldowns[itemSlot]! -= Settings.I_TPS;
            if (useInfo.itemAttackCooldowns[itemSlot]! < 0) {
               delete useInfo.itemAttackCooldowns[itemSlot];
            }
         }
      }

      // Update bow cooldown
      if (useInfo.bowCooldownTicks > 0) {
         useInfo.bowCooldownTicks--;
      }

      if (useInfo.itemAttackCooldowns[useInfo.selectedItemSlot] === undefined && useInfo.extraAttackCooldownTicks > 0) {
         useInfo.extraAttackCooldownTicks--;
      }
   }
}

export function getCrossbowLoadProgressRecordLength(useInfo: InventoryUseInfo): number {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * Object.keys(useInfo.crossbowLoadProgressRecord).length;
   return lengthBytes;
}

export function addCrossbowLoadProgressRecordToPacket(packet: Packet, useInfo: InventoryUseInfo): void {
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
   for (const useInfo of inventoryUseComponent.inventoryUseInfos) {
      lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * Object.keys(useInfo.itemAttackCooldowns).length
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * Object.keys(useInfo.spearWindupCooldowns).length;
      lengthBytes += getCrossbowLoadProgressRecordLength(useInfo);
      lengthBytes += 11 * Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   packet.addNumber(inventoryUseComponent.inventoryUseInfos.length);
   for (let i = 0; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
      const limbInfo = inventoryUseComponent.inventoryUseInfos[i];

      packet.addNumber(limbInfo.usedInventoryName);
      packet.addNumber(limbInfo.selectedItemSlot);
      packet.addNumber(limbInfo.bowCooldownTicks);

      const attackCooldownEntries = Object.entries(limbInfo.itemAttackCooldowns).map(([a, b]) => [Number(a), b]) as Array<[number, number]>;
      packet.addNumber(attackCooldownEntries.length);
      for (let i = 0; i < attackCooldownEntries.length; i++) {
         const [itemSlot, cooldown] = attackCooldownEntries[i];
         packet.addNumber(itemSlot);
         packet.addNumber(cooldown);
      }

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
   }
}

export function setLimbActions(inventoryUseComponent: InventoryUseComponent, limbAction: LimbAction): void {
   for (let i = 0; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
      const limbInfo = inventoryUseComponent.inventoryUseInfos[i];
      limbInfo.action = limbAction;
   }
}