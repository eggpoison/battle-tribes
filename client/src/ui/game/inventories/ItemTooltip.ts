import { AnimalStaffItemInfo, ArmourItemInfo, Item, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, itemInfoIsTool, ItemType } from "../../../../../shared/src/items/items";
import { assert } from "../../../../../shared/src/utils";
import CLIENT_ITEM_INFO_RECORD from "../../../game/client-item-info";

let itemTooltipElem: HTMLElement | null = null;
let tooltipItem: Item | null = null;

const createItemTooltip = (item: Item): void => {
   const clientItemInfo = CLIENT_ITEM_INFO_RECORD[item.type];
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   const itemInfo = ITEM_INFO_RECORD[item.type];

   const rootElem = document.createElement("div");
   rootElem.id = "item-tooltip";
   document.body.appendChild(rootElem);

   const itemNameElem = document.createElement("p");
   itemNameElem.className = "item-name";
   itemNameElem.textContent = item.nickname !== "" ? '"' + item.nickname + '"' : clientItemInfo.name;
   rootElem.appendChild(itemNameElem);

   if (itemCategory === "animalStaff") {
      const controlRangeTextElem = document.createElement("p");
      controlRangeTextElem.textContent = "Control range: " + (itemInfo as AnimalStaffItemInfo).controlRange + " units";
      rootElem.appendChild(controlRangeTextElem);
   } else if (itemCategory === "armour") {
      const defenceTextElem = document.createElement("p");
      defenceTextElem.textContent = "Defence: " + ((itemInfo as ArmourItemInfo).defence * 100) + "%";
      rootElem.appendChild(defenceTextElem);
   }

   if (itemInfoIsTool(item.type, itemInfo)) {
      const damageTextElem = document.createElement("p");
      damageTextElem.textContent = "Damage: " + itemInfo.damage;
      rootElem.appendChild(damageTextElem);
   }
   // @SQUEAM
   if (item.type === ItemType.mrpebbles) {
      const damageTextElem = document.createElement("p");
      damageTextElem.textContent = "Damage: 1";
      rootElem.appendChild(damageTextElem);
   }

   if (clientItemInfo.flavourText !== undefined) {
      const flavourTextElem = document.createElement("p");
      flavourTextElem.className = "flavour-text";
      flavourTextElem.textContent = clientItemInfo.flavourText;
      rootElem.appendChild(flavourTextElem);
   }

   if (item.namer !== "") {
      const namerElem = document.createElement("p");
      namerElem.className = "namer";
      namerElem.textContent = "Named by " + item.namer + ".";
      rootElem.appendChild(namerElem);
   }
   
   assert(itemTooltipElem === null);
   itemTooltipElem = rootElem;
}

export function updateItemTooltipPosition(x: number, y: number): void {
   if (itemTooltipElem !== null) {
      itemTooltipElem.style.left = x + "px";
      itemTooltipElem.style.top = y + "px";
   }
}

const destroyItemTooltip = (): void => {
   assert(itemTooltipElem !== null);
   itemTooltipElem.remove();
   itemTooltipElem = null;
}

export function setTooltipItem(item: Item): void {
   if (item !== tooltipItem) {
      if (tooltipItem !== null) {
         // @Speed
         destroyItemTooltip();
      }
      
      createItemTooltip(item);
      tooltipItem = item;
   }
}

export function clearTooltipItem(): void {
   if (tooltipItem !== null) {
      destroyItemTooltip();
      tooltipItem = null;
   }
}