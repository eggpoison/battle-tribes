import { Inventory, InventoryName } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";

let selectedItemSlot = $state(1);

let hotbarThrownBattleaxeItemID = $state(-1);
let offhandThrownBattleaxeItemID = $state(-1);

let hotbar = $state(new Inventory(Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, InventoryName.hotbar));
let offhand = $state(new Inventory(1, 1, InventoryName.offhand));
let heldItemSlot = $state(new Inventory(1, 1, InventoryName.heldItemSlot));
let craftingOutputSlot = $state(new Inventory(1, 1, InventoryName.craftingOutputSlot));
let backpack = $state(new Inventory(1, 1, InventoryName.backpack));
let backpackSlot = $state(new Inventory(1, 1, InventoryName.backpackSlot));
let armourSlot = $state(new Inventory(1, 1, InventoryName.armourSlot));
let gloveSlot = $state(new Inventory(1, 1, InventoryName.gloveSlot));

export const inventoryState = {
   get selectedItemSlot() {
      return selectedItemSlot;
   },
   setSelectedItemSlot(newSelectedItemSlot: number): void {
      selectedItemSlot = newSelectedItemSlot;
   },

   get hotbarThrownBattleaxeItemID() {
      return hotbarThrownBattleaxeItemID;
   },
   setHotbarThrownBattleaxeItemID(newHotbarThrownBattleaxeItemID: number): void {
      hotbarThrownBattleaxeItemID = newHotbarThrownBattleaxeItemID;
   },

   get offhandThrownBattleaxeItemID() {
      return offhandThrownBattleaxeItemID;
   },
   setOffhandThrownBattleaxeItemID(newOffhandThrownBattleaxeItemID: number): void {
      offhandThrownBattleaxeItemID = newOffhandThrownBattleaxeItemID;
   },

   get hotbar() {
      return hotbar;
   },
   // @Garbage
   setHotbar(newHotbar: Inventory): void {
      hotbar = newHotbar;
   },

   get offhand() {
      return offhand;
   },
   // @Garbage
   setOffhand(newOffhand: Inventory): void {
      offhand = newOffhand;
   },

   get heldItemSlot() {
      return heldItemSlot;
   },
   // @Garbage
   setHeldItemSlot(newHeldItemSlot: Inventory): void {
      heldItemSlot = newHeldItemSlot;
   },

   get craftingOutputSlot() {
      return craftingOutputSlot;
   },
   // @Garbage
   setCraftingOutputSlot(newCraftingOutputSlot: Inventory): void {
      craftingOutputSlot = newCraftingOutputSlot;
   },

   get backpack() {
      return backpack;
   },
   // @Garbage
   setBackpack(newBackpack: Inventory): void {
      backpack = newBackpack;
   },

   get backpackSlot() {
      return backpackSlot;
   },
   // @Garbage
   setBackpackSlot(newBackpackSlot: Inventory): void {
      backpackSlot = newBackpackSlot;
   },

   get armourSlot() {
      return armourSlot;
   },
   // @Garbage
   setArmourSlot(newArmourSlot: Inventory): void {
      armourSlot = newArmourSlot;
   },

   get gloveSlot() {
      return gloveSlot;
   },
   // @Garbage
   setGloveSlot(newGloveSlot: Inventory): void {
      gloveSlot = newGloveSlot;
   }
};