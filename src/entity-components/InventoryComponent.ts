import Board from "../Board";
import Component from "../Component";
import Resource from "../entities/Resource";
import Item from "../items/Item";
import ITEMS, { ItemName } from "../items";

export type ItemSlots = Array<[ItemName, number]>;

export type ItemList = Partial<Record<ItemName, number>>;

class InventoryComponent extends Component {
    private itemSlots: ItemSlots = new Array<[ItemName, number]>();
    private availableSlotCount: number;

    constructor(availableSlotCount: number) {
        super();

        this.availableSlotCount = availableSlotCount;
    }

    public setAvailableSlots(newAvailableSlotCount: number): void {
        this.availableSlotCount = newAvailableSlotCount;
    }

    public pickupResource(resource: Resource): void {
        const item = resource.item;

        const didAdd = this.addItem(item);
        if (didAdd) Board.removeEntity(resource);
    }

    public addItem(item: Item, amount: number = 1): boolean {
        for (let slotNum = 0; slotNum < this.availableSlotCount; slotNum++) {
            // If the slot is available, add the item to the slot
            if (slotNum === this.itemSlots.length) {
                this.itemSlots[slotNum] = [item.name, amount];
                return true;
            }

            let [itemName, itemCount] = this.itemSlots[slotNum];
            const itemKey = ItemName[itemName] as unknown as ItemName;
            const itemInfo = ITEMS[itemKey];

            // If the existing item is of the same type and the stack isn't full, add it
            if (itemCount + amount <= itemInfo.stackSize) {
                this.itemSlots[slotNum][1] += amount;
                return true;
            }
        }
        return false;
    }

    public removeItem(item: Item, amount: number = 1): void {
        let remainingRemoveAmount = amount;
        for (let slotNum = 0; slotNum < this.availableSlotCount; slotNum++) {
            let [itemName, itemCount] = this.itemSlots[slotNum];

            if (itemName === item.name) {
                const removeAmount = Math.min(remainingRemoveAmount, itemCount);
                remainingRemoveAmount -= removeAmount;
                itemCount -= removeAmount;

                if (itemCount === 0) {
                    delete this.itemSlots[slotNum];
                }
                continue;
            }
        }
    }

    public getItemSlots(): ItemSlots {
        return this.itemSlots;
    }

    public getItemList(): ItemList {
        const itemList: ItemList = {};

        for (const [itemName, itemCount] of this.itemSlots) {
            if (itemList.hasOwnProperty(itemName)) {
                itemList[itemName]! += itemCount;
            } else {
                itemList[itemName] = itemCount;
            }
        }

        return itemList;
    }
}

export default InventoryComponent;