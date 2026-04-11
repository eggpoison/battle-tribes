import { MenuType } from "../../menus";
import { createTab } from "./Tab";
import { createItemsTab, destroyItemsTab } from "./tabs/ItemsTab";
import ItemTabImage from "/src/images/ui/item-tab.png";
import SummonTabImage from "/src/images/ui/summon-tab.png";
import TitlesTabImage from "/src/images/ui/titles-tab.png";
import TribesTabImage from "/src/images/ui/tribes-tab.png";

// const updateSelectedTab = (e: MouseEvent, clickedTab: Menu): void => {
//    menuSelectorState.toggleMenu(clickedTab);
//    // If not here, the items tab autofocus won't work
//    e.preventDefault();
// }

// @CLEANUP: i seem to have a whole boondoggle of create/destroy vs open/close vs show/hide in all the ui

export function createTabSelector(parent: HTMLElement): void {
   const tabSelectorElem = document.createElement("div");
   tabSelectorElem.id = "tab-selection";
   parent.appendChild(tabSelectorElem);

   createTab(tabSelectorElem, MenuType.itemsDevTab, ItemTabImage, "Items");
   createTab(tabSelectorElem, MenuType.summonDevTab, SummonTabImage, "Summon");
   createTab(tabSelectorElem, MenuType.titlesDevTab, TitlesTabImage, "Titles");
   createTab(tabSelectorElem, MenuType.tribesDevTab, TribesTabImage, "Tribes");
}

export function destroyTabSelector(): void {
   const tabSelectorElem = document.getElementById("tab-selection");
   if (tabSelectorElem !== null) {
      tabSelectorElem.remove();
   }
}