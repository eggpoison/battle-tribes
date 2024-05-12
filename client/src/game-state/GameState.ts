import { LimbAction } from "webgl-test-shared/dist/entities";
import { Inventory } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";

/** Information about the game and player. */
abstract class GameState {
   public mainAction = LimbAction.none;
   public offhandAction = LimbAction.none;

   /** Whether the instance player is placing an entity. */
   public playerIsPlacingEntity = false;

   /** Slot number of the player's currently selected item slot. */
   public selectedHotbarItemSlot = 1;

   /** Items in the player's hotbar. */
   public hotbar: Inventory = { itemSlots: {}, width: Settings.INITIAL_PLAYER_HOTBAR_SIZE, height: 1, name: "hotbar" };

   /** Items in the player's backpack. */
   public backpack: Inventory | null = null;

   /** Stores the item in the player's backpack item slot. */
   public backpackSlot: Inventory = { itemSlots: {}, width: 1, height: 1, name: "backpackSlot" };

   public gloveSlot: Inventory = { itemSlots: {}, width: 1, height: 1, name: "gloveSlot" };

   /** Item in the player's crafting output item slot. */
   public craftingOutputSlot: Inventory | null = null;

   /** Item held by the player. */
   public heldItemSlot: Inventory = { itemSlots: {}, width: 1, height: 1, name: "heldItemSlot" };

   public armourSlot: Inventory = { itemSlots: {}, width: 1, height: 1, name: "armourSlot" };

   public offhandInventory: Inventory = { itemSlots: {}, width: 1, height: 1, name: "offhand" };

   public hotbarCrossbowLoadProgressRecord: Record<number, number> = {};

   // Used to give movement penalty while wearing the leaf suit.
   // @Cleanup: would be great to not store a variable to do this.
   public lastPlantCollisionTicks = 0;

   public resetFlags(): void {
      this.mainAction = LimbAction.none;
      this.offhandAction = LimbAction.none;
      this.playerIsPlacingEntity = false;
   }
}

export default GameState;