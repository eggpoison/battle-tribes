import ITEMS, { ItemName } from "./items";

interface ItemInfo {
    readonly iconSrc: string;
}

class Item {
    public readonly imageSrc: string;

    constructor(itemInfo: ItemInfo) {
        this.imageSrc = itemInfo.iconSrc;
    }

    public get name(): ItemName {
        for (const [itemName, item] of Object.entries(ITEMS)) {
            if (item === this) {
                return ItemName[itemName as keyof typeof ItemName];
            }
        }

        throw new Error("Cannot find item name!");
    }
}

export default Item;