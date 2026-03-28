import { sendDevGiveItemPacket } from "../../../../game/networking/packet-sending/packet-sending";
import { assert, getItemStackSize, ItemType } from "webgl-test-shared";
import { createItemCatalogue, destroyItemCatalogue } from "./ItemCatalogue";

let itemsTabElem: HTMLElement | null = null;

const onSlotClick = (e: MouseEvent, itemType: ItemType): void => {
   const amount = e.shiftKey ? getItemStackSize(itemType) : 1;
   sendDevGiveItemPacket(itemType, amount);
}

export function createItemsTab(): void {
   assert(itemsTabElem === null);
   itemsTabElem = createItemCatalogue(onSlotClick);
   document.body.appendChild(itemsTabElem);
}

export function destroyItemsTab(): void {
   assert(itemsTabElem !== null);
   destroyItemCatalogue(itemsTabElem);
   itemsTabElem = null;
}