import { LimbAction } from "webgl-test-shared/dist/entities";
import { Inventory } from "webgl-test-shared/dist/items";
/** Information about the game and player. */
declare abstract class GameState {
    mainAction: LimbAction;
    offhandAction: LimbAction;
    /** Whether the instance player is placing an entity. */
    playerIsPlacingEntity: boolean;
    /** Slot number of the player's currently selected item slot. */
    selectedHotbarItemSlot: number;
    /** Items in the player's hotbar. */
    hotbar: Inventory;
    /** Items in the player's backpack. */
    backpack: Inventory | null;
    /** Stores the item in the player's backpack item slot. */
    backpackSlot: Inventory;
    gloveSlot: Inventory;
    /** Item in the player's crafting output item slot. */
    craftingOutputSlot: Inventory | null;
    /** Item held by the player. */
    heldItemSlot: Inventory;
    armourSlot: Inventory;
    offhandInventory: Inventory;
    hotbarCrossbowLoadProgressRecord: Record<number, number>;
    lastPlantCollisionTicks: number;
    resetFlags(): void;
}
export default GameState;
