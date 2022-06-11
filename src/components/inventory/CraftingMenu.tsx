import { useEffect, useRef } from "react";
import Crafting from "../../crafting/Crafting";
import Recipe from "../../crafting/Recipe";
import Player from "../../entities/tribe-members/Player";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import ITEMS, { ItemName } from "../../items/items";
import InventoryTitle from "./InventoryTitle";
import InventoryWrapper from "./InventoryWrapper";

const craft = (recipe: Recipe): void => {
   const playerInventory = Player.instance.getComponent(FiniteInventoryComponent)!;

   const itemSlots = playerInventory.getItemSlots();

   // Check if the player has the materials
   const remainingMaterials = Object.assign({}, recipe.materials);
   for (const itemSlot of itemSlots) {
      if (typeof itemSlot === "undefined") continue;

      const [itemName, itemAmount] = itemSlot;
      if (!remainingMaterials.hasOwnProperty(itemName)) continue;

      remainingMaterials[itemName]! -= itemAmount;
   }

   let containsExactAmount = true;
   for (const amount of Object.values(remainingMaterials)) {
      if (amount !== 0) containsExactAmount = false;
      if (amount > 0) return;
   }

   const resultName = ItemName[recipe.result.name] as unknown as ItemName;

   if (!containsExactAmount) {
      let canCraft = false;
      for (let slotNum = 0; slotNum < playerInventory.slotCount; slotNum++) {
         const itemSlot = itemSlots[slotNum];
         
         // Can craft if there is an available spot
         if (typeof itemSlot === "undefined") {
            canCraft = true;
            break;
         }

         const [currentItemName, currentItemAmount] = itemSlot;
         
         // If there is already one of the result in the inventory and it won't exceed the stack size
         if (currentItemName === resultName && currentItemAmount + recipe.craftAmount <= recipe.result.stackSize) {
            canCraft = true;
            break;
         }
      }
      if (!canCraft) return;
   }

   // Take away materials
   const entries = Object.entries(recipe.materials) as unknown as Array<[ItemName, number]>;
   for (const [name, amount] of entries) {
      playerInventory.removeItem(Number(name), amount);
   }

   // Add result
   playerInventory.addItem(resultName, recipe.craftAmount);
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
         <div className="item-slot" onClick={() => craft(recipe)}>
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
            <div className="amount">{recipe.craftAmount}</div>
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
      <InventoryWrapper id="crafting-menu" ref={craftingMenuRef}>
         <InventoryTitle content="Crafting" />
         <div className="slots">
            {slots}
         </div>
      </InventoryWrapper>
   );
}

export default CraftingMenu;