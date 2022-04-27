import { ItemList } from "../entity-components/InventoryComponent";
import ITEMS, { ItemName } from "../items";
import Item from "../items/Item";

class Recipe {
    private readonly result: Item;
    private readonly costs: ItemList;

    constructor(resultName: ItemName, costs: ItemList) {
        this.result = ITEMS[resultName];
        this.costs = costs;
    }

    public canAfford(availableItems: ItemList) {

    }
}

export default Recipe;