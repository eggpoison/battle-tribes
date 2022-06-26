import Entity from "../entities/Entity";
import FiniteInventoryComponent from "../entity-components/inventory/FiniteInventoryComponent";

export interface ItemInfo {
   readonly displayName: string;
   readonly description: string;
   readonly imageSrc: string;
   readonly stackSize: number;
}

class Item implements ItemInfo {
   public isInLeftClick: boolean = false;
   public isInRightClick: boolean = false;

   public readonly displayName: string;
   public readonly description: string;
   public readonly imageSrc: string;
   public readonly stackSize: number;

   constructor(itemInfo: ItemInfo) {
      this.displayName = itemInfo.displayName;
      this.description = itemInfo.description;
      this.imageSrc = itemInfo.imageSrc;
      this.stackSize = itemInfo.stackSize;
   }

   public startLeftClick(_entity: Entity, _inventoryComponent: FiniteInventoryComponent, _slotNum: number): void {
      this.isInLeftClick = true;
   };
   public duringLeftClick?(entity: Entity, inventoryComponent: FiniteInventoryComponent, slotNum: number): void;
   public endLeftClick(_entity: Entity, _inventoryComponent: FiniteInventoryComponent, _slotNum: number): void {
      this.isInLeftClick = false;
   }

   public startRightClick(_entity: Entity, _inventoryComponent: FiniteInventoryComponent, _slotNum: number): void {
      this.isInRightClick = true;
   }
   public duringRightClick?(entity: Entity, inventoryComponent: FiniteInventoryComponent, slotNum: number): void;
   public endRightClick(_entity: Entity, _inventoryComponent: FiniteInventoryComponent, _slotNum: number): void {
      this.isInRightClick = false;
   }
}

export default Item;