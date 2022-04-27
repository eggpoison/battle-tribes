import Board from "../Board";
import Component from "../Component";
import Resource from "../entities/Resource";
import Item from "../Item";
import { ItemName } from "../items";

type InventoryItems = Partial<Record<ItemName, number>>;

class InventoryComponent extends Component {
    private items: InventoryItems = {};

    public pickupResource(resource: Resource): void {
        Board.removeEntity(resource);

        const item = resource.item;
        this.addItem(item);
    }

    public addItem(item: Item, amount: number = 1): void {
        if (this.items.hasOwnProperty(item.name)) {
            this.items[item.name]! += amount;
        } else {
            this.items[item.name] = amount;
        }
    }

    public removeItem(item: Item, amount: number = 1): void {
        this.items[item.name]! -= amount;

        if (this.items[item.name]! <= 0) {
            delete this.items[item.name];
        }
    }
}

export default InventoryComponent;