import { ItemType, getItemStackSize } from "../../../../../../shared/src/items/items";
import { assert } from "../../../../../../shared/src/utils";
import { sendDevGiveItemPacket } from "../../../../game/networking/packet-sending/packet-sending";
import { createItemCatalogue, destroyItemCatalogue } from "./ItemCatalogue";

// @Memory
let itemsTabElem: HTMLElement | null = null;

const onSlotClick = (e: MouseEvent, itemType: ItemType): void => {
   const amount = e.shiftKey ? getItemStackSize(itemType) : 1;
   sendDevGiveItemPacket(itemType, amount);
}

export function createItemsTab(): void {
   const elem = createItemCatalogue(onSlotClick);
   document.body.appendChild(elem);

   assert(itemsTabElem === null);
   itemsTabElem = elem;
}

export function destroyItemsTab(): void {
   assert(itemsTabElem !== null);
   destroyItemCatalogue(itemsTabElem);
   itemsTabElem = null;
}