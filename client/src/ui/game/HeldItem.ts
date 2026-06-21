import { Item } from "../../../../shared/src/items/items";
import { assert } from "../../../../shared/src/utils";
import { getItemTypeImage } from "../../game/client-item-info";
import { cursorX, cursorY } from "../../game/event-handling";

let rootElem: HTMLElement | null = null;

export function createHeldItemElem(heldItem: Item): void {
   const elem = document.createElement("div");
   elem.id = "held-item";
   // @Speed
   elem.innerHTML = `
      <img class="held-item-icon" src=${getItemTypeImage(heldItem.type)} />
      <div class="held-item-count">${heldItem.count > 1 ? heldItem.count : ""}</div>
   `;
   // @copynpaste
   elem.style.top = cursorY + "px";
   elem.style.left = cursorX + "px";
   document.body.appendChild(elem);
   rootElem = elem;
}

export function updateHeldItemPosition(x: number, y: number): void {
   if (rootElem !== null) {
      rootElem.style.top = y + "px";
      rootElem.style.left = x + "px";
   }
}

export function destroyHeldItemElem(): void {
   assert(rootElem !== null);
   rootElem.remove();
}