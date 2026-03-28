import { Menu, toggleMenu } from "../../menus";

// @Incomplete
// const isSelected = $derived(menuSelectorState.menuIsOpen(props.menu));

export function createTab(parent: HTMLElement, menu: Menu, imgSrc: string, text: string, openFunc: () => void, closeFunc: () => void): void {
   const tab = document.createElement("div");
   tab.className = "tab-selector devmode-container";
   tab.onmousedown = (): void => { toggleMenu(menu, openFunc, closeFunc); };
   parent.appendChild(tab);

   const imgElem = document.createElement("img");
   imgElem.src = imgSrc;
   tab.appendChild(imgElem);

   const spanElem = document.createElement("span");
   spanElem.textContent = text;
   tab.appendChild(spanElem);
}