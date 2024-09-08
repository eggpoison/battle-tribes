import { LimbAction } from "webgl-test-shared/dist/entities";
import { Inventory, InventoryName } from "webgl-test-shared/dist/items/items";
import { Settings } from "webgl-test-shared/dist/settings";

/** Information about the game and player. */
abstract class GameState {
   /** Whether the instance player is placing an entity. */
   public playerIsPlacingEntity = false;

   /** Slot number of the player's currently selected item slot. */
   public selectedHotbarItemSlot = 1;

   /** Items in the player's hotbar. */
   public readonly hotbar = new Inventory(Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, InventoryName.hotbar);

   /** Items in the player's backpack. */
   public backpack: Inventory | null = null;

   /** Stores the item in the player's backpack item slot. */
   public readonly backpackSlot = new Inventory(1,1, InventoryName.backpackSlot);

   public readonly gloveSlot = new Inventory(1, 1, InventoryName.gloveSlot);

   /** Item in the player's crafting output item slot. */
   public readonly craftingOutputSlot = new Inventory(1, 1, InventoryName.craftingOutputSlot);

   /** Item held by the player. */
   public readonly heldItemSlot = new Inventory(1, 1, InventoryName.heldItemSlot);

   public readonly armourSlot = new Inventory(1, 1, InventoryName.armourSlot);

   public readonly offhandInventory = new Inventory(1, 1, InventoryName.offhand);

   // @Cleanup: weird to be here
   public hotbarCrossbowLoadProgressRecord: Partial<Record<number, number>> = {};

   // Used to give movement penalty while wearing the leaf suit.
   // @Cleanup: would be great to not store a variable to do this.
   public lastPlantCollisionTicks = 0;

   public resetFlags(): void {
      this.playerIsPlacingEntity = false;
   }
}

export default GameState;