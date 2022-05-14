import { useEffect, useRef } from "react";
import Crafting from "../../crafting/Crafting";
import Recipe from "../../crafting/Recipe";
import "../../css/crafting-menu.css";
import Player from "../../entities/tribe-members/Player";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import ITEMS, { ItemName } from "../../items/items";
import InventoryViewerManager from "../inventory/InventoryViewerManager";

const craft = (recipe: Recipe): void => {
   const playerInventory = Player.instance.getComponent(FiniteInventoryComponent)!;

   const itemSlots = playerInventory.getItemSlots();

   // Check if the player has the materials
   const remainingMaterials = Object.assign({}, recipe.materials);
   for (const itemSlot of itemSlots) {
      const key = ItemName[itemSlot[0]] as unknown as ItemName;
      if (!(key in remainingMaterials)) continue;

      remainingMaterials[key]! -= itemSlot[1];
   }

   let containsExactAmount = true;
   for (const amount of Object.values(remainingMaterials)) {
      if (amount !== 0) containsExactAmount = false;
      if (amount > 0) return;
   }

   if (!containsExactAmount) {
      let canCraft = false;
      for (let slotNum = 0; slotNum < playerInventory.slotCount; slotNum++) {
         const slotInfo = itemSlots[slotNum];
         
         // Can craft if there is an available spot
         if (typeof slotInfo === "undefined") {
            canCraft = true;
            break;
         }
         
         // If there is already one of the result in the inventory and it won't exceed the stack size
         if (slotInfo[0] === recipe.result.name && slotInfo[1] < recipe.result.stackSize) {
            canCraft = true;
            break;
         }
      }
      if (!canCraft) return;
   }

   // Take away materials
   for (const [name, amount] of Object.entries(recipe.materials)) {
      playerInventory.removeItem(ItemName[name as unknown as ItemName] as unknown as ItemName, amount);
   }

   // Add result
   playerInventory.addItem(recipe.result.name, recipe.craftAmount);

   // Update inventory display
   InventoryViewerManager.getInstance("playerInventory").setItemSlots(playerInventory.getItemSlots());
}

const WIDTH = 6;
const HEIGHT = 4;

interface SlotInfo {
   recipe: Recipe | null;
}
const Slot = ({ recipe }: SlotInfo) => {
   if (recipe !== null) {
      const imageSrc = require("../../images/" + recipe.result.imageSrc);

      return (
         <div className="slot" onClick={() => craft(recipe)}>
            <img src={imageSrc} alt={recipe.result.imageSrc} className="preview" />
            <div className="hover-info">
               <h3 className="result">{recipe.result.displayName}</h3>
               <p className="description">{recipe.result.description}</p>

               <ul>
                  {Object.entries(recipe.materials).map(([name, amount], i) => {
                     const item = ITEMS[name as unknown as ItemName];

                     const previewSrc = require("../../images/" + item.imageSrc);
                     
                     return <li key={i}>{amount} {item.displayName} <img src={previewSrc} alt={item.name as unknown as string} className="material-image-preview" /></li>;
                  })}
               </ul>
            </div>
         </div>
      );
   }

   return (
      <div className="slot"></div>
   );
}

const CraftingMenu = () => {
   const craftingMenuRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      if (craftingMenuRef.current !== null) {
         craftingMenuRef.current.style.setProperty("--width", WIDTH.toString());
         craftingMenuRef.current.style.setProperty("--height", HEIGHT.toString());
      }
   }, []);

   const recipes = Crafting.getRecipeList();

   const slots = new Array<JSX.Element>();
   for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
         const idx = y * WIDTH + x;

         const recipe = typeof recipes[idx] !== "undefined" ? recipes[idx] : null;

         slots.push(
            <Slot recipe={recipe} key={idx} />
         );
      }
   }

   return (
      <div id="crafting-menu" ref={craftingMenuRef}>
         <div className="slots">
            {slots}
         </div>
      </div>
   );
}

export default CraftingMenu;