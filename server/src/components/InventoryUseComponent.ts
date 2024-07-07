import { InventoryUseComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { LimbAction } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { ComponentArray } from "./ComponentArray";
import { Inventory, InventoryName } from "webgl-test-shared/dist/items/items";

export interface InventoryUseComponentParams {}

export interface InventoryUseInfo {
   selectedItemSlot: number;
   readonly inventory: Inventory;
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

   public globalAttackCooldown = 0;

   public addInventoryUseInfo(inventory: Inventory): void {
      this.inventoryUseInfos.push({
         selectedItemSlot: 1,
         inventory: inventory,
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
      });
   }
}

export const InventoryUseComponentArray = new ComponentArray<ServerComponentType.inventoryUse, InventoryUseComponent>(true, {
   serialise: serialise
});

export function tickInventoryUseComponent(inventoryUseComponent: InventoryUseComponent): void {
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      inventoryUseComponent.globalAttackCooldown--;
   }
   
   for (let i = 0; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
      const useInfo = inventoryUseComponent.inventoryUseInfos[i];

      // Update attack cooldowns
      for (let itemSlot = 1; itemSlot <= useInfo.inventory.width * useInfo.inventory.height; itemSlot++) {
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

export function getInventoryUseInfo(inventoryUseComponent: InventoryUseComponent, inventoryName: InventoryName): InventoryUseInfo {
   for (let i = 0; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
      const useInfo = inventoryUseComponent.inventoryUseInfos[i];
      if (useInfo.inventory.name === inventoryName) {
         return useInfo;
      }
   }

   throw new Error("Can't find inventory use info for inventory name " + inventoryName);
}

export function hasInventoryUseInfo(inventoryUseComponent: InventoryUseComponent, inventoryName: InventoryName): boolean {
   for (let i = 0; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
      const useInfo = inventoryUseComponent.inventoryUseInfos[i];
      if (useInfo.inventory.name === inventoryName) {
         return true;
      }
   }

   return false;
}

function serialise(entityID: number): InventoryUseComponentData {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.inventoryUse,
      inventoryUseInfos: inventoryUseComponent.inventoryUseInfos.map(limbInfo => {
         return {
            selectedItemSlot: limbInfo.selectedItemSlot,
            inventoryName: limbInfo.inventory.name,
            bowCooldownTicks: limbInfo.bowCooldownTicks,
            itemAttackCooldowns: limbInfo.itemAttackCooldowns,
            spearWindupCooldowns: limbInfo.spearWindupCooldowns,
            crossbowLoadProgressRecord: limbInfo.crossbowLoadProgressRecord,
            foodEatingTimer: limbInfo.foodEatingTimer,
            action: limbInfo.action,
            lastAttackTicks: limbInfo.lastAttackTicks,
            lastEatTicks: limbInfo.lastEatTicks,
            lastBowChargeTicks: limbInfo.lastBowChargeTicks,
            lastSpearChargeTicks: limbInfo.lastSpearChargeTicks,
            lastBattleaxeChargeTicks: limbInfo.lastBattleaxeChargeTicks,
            lastCrossbowLoadTicks: limbInfo.lastCrossbowLoadTicks,
            lastCraftTicks: limbInfo.lastCraftTicks,
            thrownBattleaxeItemID: limbInfo.thrownBattleaxeItemID,
            lastAttackCooldown: limbInfo.lastAttackCooldown
         };
      })
   };
}

export function setLimbActions(inventoryUseComponent: InventoryUseComponent, limbAction: LimbAction): void {
   for (let i = 0; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
      const limbInfo = inventoryUseComponent.inventoryUseInfos[i];
      limbInfo.action = limbAction;
   }
}