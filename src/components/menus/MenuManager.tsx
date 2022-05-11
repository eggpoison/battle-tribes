import React from "react";
import { useEffect, useState } from "react";
import CraftingMenu from "./CraftingMenu";

type MenuNames = "crafting";

const MENUS: Record<MenuNames, () => JSX.Element> = {
   crafting: CraftingMenu
};

let openMenuCallback: (menuName: MenuNames) => void;
let closeMenuCallback: () => void;

export function openMenu(menuName: MenuNames): void {
   openMenuCallback(menuName);
}

export function closeMenu(): void {
   closeMenuCallback();
}

const MenuManager = () => {
   const [currentMenu, setCurrentMenu] = useState<MenuNames | null>(null);

   const keyPress = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
         setCurrentMenu(null);
      }
   }

   useEffect(() => {
      openMenuCallback = (menuName: MenuNames): void => {
         setCurrentMenu(menuName);
      }

      closeMenuCallback = (): void => {
         setCurrentMenu(null);
      }

      // Close the current menu when the escape key is pressed
      document.addEventListener("keydown", e => keyPress(e));
      return () => {
         document.removeEventListener("keydown", e => keyPress(e));
      }
   }, []);

   return (
      <div>
         {currentMenu !== null ? (
            React.createElement(MENUS[currentMenu])
         ) : null}
      </div>
   );
}

export default MenuManager;