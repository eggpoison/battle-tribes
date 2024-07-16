import { InventoryUseComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, LimbAction } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { ComponentArray } from "./ComponentArray";
import { InventoryName } from "webgl-test-shared/dist/items/items";
import { getInventory, InventoryComponentArray } from "./InventoryComponent";

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
   serialise: serialise
});

export function tickInventoryUseComponent(entity: EntityID, inventoryUseComponent: InventoryUseComponent): void {
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

function serialise(entityID: number): InventoryUseComponentData {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.inventoryUse,
      inventoryUseInfos: inventoryUseComponent.inventoryUseInfos.map(limbInfo => {
         return {
            selectedItemSlot: limbInfo.selectedItemSlot,
            inventoryName: limbInfo.usedInventoryName,
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