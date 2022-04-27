import Item, { ItemInfo } from "./Item";

interface FoodItemInfo extends ItemInfo {
    /** Amount of entity health restored by eating. */
    readonly healthReplenishAmount: number;
    /** The time it takes to eat one of the food, in seconds. */
    readonly eatTime: number;
}

class FoodItem extends Item implements FoodItemInfo {
    public readonly healthReplenishAmount: number;
    public readonly eatTime: number;
    
    constructor(itemInfo: FoodItemInfo) {
        super(itemInfo);

        this.healthReplenishAmount = itemInfo.healthReplenishAmount;
        this.eatTime = itemInfo.eatTime;
    }
}

export default FoodItem;