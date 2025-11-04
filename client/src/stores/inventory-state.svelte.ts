import { Inventory, InventoryName } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";

export let hotbarState = $state(new Inventory(Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, InventoryName.hotbar));
export let offhandState = $state(new Inventory(1, 1, InventoryName.offhand));
export let heldItemSlotState = $state(new Inventory(1, 1, InventoryName.heldItemSlot));
export let craftingOutputSlotState = $state(new Inventory(1, 1, InventoryName.craftingOutputSlot));
export let backpackState = $state(new Inventory(1, 1, InventoryName.backpack));
export let backpackSlotState = $state(new Inventory(1, 1, InventoryName.backpackSlot));
export let armourSlotState = $state(new Inventory(1, 1, InventoryName.armourSlot));
export let gloveSlotState = $state(new Inventory(1, 1, InventoryName.gloveSlot));

export function setHotbarState(hotbar: Inventory): void {
   hotbarState = hotbar;
}
export function setOffhandState(offhand: Inventory): void {
   offhandState = offhand;
}
export function setHeldItemSlotState(heldItemSlot: Inventory): void {
   heldItemSlotState = heldItemSlot;
}
export function setCraftingOutputSlotState(craftingOutputSlot: Inventory): void {
   craftingOutputSlotState = craftingOutputSlot;
}
export function setBackpackState(backpack: Inventory): void {
   backpackState = backpack;
}
export function setBackpackSlotState(backpackSlot: Inventory): void {
   backpackSlotState = backpackSlot;
}
export function setArmourSlotState(armourSlot: Inventory): void {
   armourSlotState = armourSlot;
}
export function setGloveSlotState(gloveSlot: Inventory): void {
   gloveSlotState = gloveSlot;
}