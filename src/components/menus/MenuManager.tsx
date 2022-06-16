import React from "react";
import { useEffect, useState } from "react";
import CraftingMenu from "../inventory/CraftingMenu";
import EntitySpawnMenu from "./EntitySpawnMenu";

type MenuNames = "crafting" | "entitySpawn";

const MENUS: Record<MenuNames, () => JSX.Element | null> = {
   crafting: CraftingMenu,
   entitySpawn: EntitySpawnMenu
};

let toggleMenuCallback: (menuName: MenuNames) => void;
let openMenuCallback: (menuName: MenuNames) => void;
let menuIsOpenCallback: (menuName: MenuNames) => boolean;
let closeMenuCallback: () => void;

export function toggleMenu(menuName: MenuNames): void {
   toggleMenuCallback(menuName);
}

export function openMenu(menuName: MenuNames): void {
   openMenuCallback(menuName);
}

export function closeMenu(): void {
   closeMenuCallback();
}

export function menuIsOpen(menuName: MenuNames): boolean {
   return menuIsOpenCallback(menuName);
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

   useEffect(() => {
      toggleMenuCallback = (menuName: MenuNames): void => {
         if (currentMenu !== menuName) {
            setCurrentMenu(menuName);
         } else {
            setCurrentMenu(null);
         }
      }

      menuIsOpenCallback = (menuName: MenuNames): boolean => {
         return currentMenu === menuName;
      }
   }, [currentMenu]);

   return (
      <div>
         {currentMenu !== null ? (
            React.createElement(MENUS[currentMenu])
         ) : null}
      </div>
   );
}

export default MenuManager;