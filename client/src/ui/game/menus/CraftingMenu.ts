import { CRAFTING_RECIPES, CraftingStationEntityType } from "../../../../../shared/src/items/crafting-recipes";
import { Inventory, InventoryName } from "../../../../../shared/src/items/items";
import { ItemTally2, tallyInventoryItems } from "../../../../../shared/src/items/ItemTally";
import { getTechRequiredForItem } from "../../../../../shared/src/techs";
import { assert } from "../../../../../shared/src/utils";
import { playHeadSound } from "../../../game/sound";
import { sendCraftItemPacket } from "../../../game/networking/packet-sending/packet-sending";
import { playerTribe } from "../../../game/tribes";
import { addItemToItemSlot, createItemSlot, removeItemSlotElemSelection, addItemSlotElemSelection, makeItemSlotInteractable } from "../inventories/ItemSlot";
import { getEntityType } from "../../../game/world";
import { createInventoryContainer, getClickedItemSlotIdx } from "../inventories/Inventory";
import { getSelectedEntity } from "../../../game/entity-selection";
import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../game/client-item-info";
import { playerInstance } from "../../../game/player";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";

const enum Var {
   RECIPE_BROWSER_WIDTH = 3,
   RECIPE_BROWSER_MIN_HEIGHT = 5
}

let craftingMenuElem: HTMLElement | null = null;

const availableRecipes: number[] = [];
const craftableRecipes: number[] = [];

let selectedRecipeIdx = -1;

export function updateCraftableRecipes(usableInventories: readonly Inventory[]): void {
   const availableItemsTally = new ItemTally2();
   for (const inventory of usableInventories) {
      tallyInventoryItems(availableItemsTally, inventory);
   }

   // @Garbage
   craftableRecipes.length = 0;
   // @Speed: this always goes over all crafting recipes. When it only needs to go over the ones available to the current crafting menu.
   for (let i = 0; i < CRAFTING_RECIPES.length; i++) {
      const recipe = CRAFTING_RECIPES[i];
      if (availableItemsTally.fullyCoversOtherTally(recipe.ingredients)) {
         craftableRecipes.push(i);
      }
   }
}

function craftRecipe(): void {
   if (selectedRecipeIdx === -1 || !craftableRecipes.includes(selectedRecipeIdx)) {
      return;
   }

   playHeadSound("craft.mp3", 0.25, 1);

   sendCraftItemPacket(selectedRecipeIdx);
}

function selectRecipe(itemSlotIdx: number): void {
   assert(craftingMenuElem !== null);
   
   const recipeIdx = availableRecipes[itemSlotIdx];
   if (recipeIdx === selectedRecipeIdx) {
      return;
   }

   selectedRecipeIdx = recipeIdx;

   const previouslySelectedRecipeElem: HTMLElement | null = craftingMenuElem.querySelector(".recipe-browser .selected");
   if (previouslySelectedRecipeElem !== null) {
      removeItemSlotElemSelection(previouslySelectedRecipeElem);
   }

   const itemSlotElem = craftingMenuElem.querySelector(".inventory")!.children[itemSlotIdx] as HTMLElement;
   addItemSlotElemSelection(itemSlotElem);

   refreshCraftingArea();
}

function deselectRecipe(): void {
   assert(craftingMenuElem);

   selectedRecipeIdx = -1;
   
   const previouslySelectedRecipeElem: HTMLElement | null = craftingMenuElem.querySelector(".recipe-browser .selected");
   if (previouslySelectedRecipeElem !== null) {
      removeItemSlotElemSelection(previouslySelectedRecipeElem);
   }

   refreshCraftingArea();
}

const clickRecipeSlot = (e: MouseEvent) => {
   const itemSlotIdx = getClickedItemSlotIdx(e, Var.RECIPE_BROWSER_WIDTH);
   if (itemSlotIdx < availableRecipes.length) {
      selectRecipe(itemSlotIdx);
   } else {
      deselectRecipe();
   }
}

function refreshCraftingArea(): void {
   const craftingAreaElem = craftingMenuElem!.querySelector(".crafting-area")!;
   craftingAreaElem.replaceChildren();
   // @Hack cuz linter is weird
   createCraftingArea(craftingAreaElem as HTMLElement);
}

function createCraftingArea(craftingAreaElem: HTMLElement): void {
   if (selectedRecipeIdx !== -1) {
      const recipe = CRAFTING_RECIPES[selectedRecipeIdx];
      const productInfo = CLIENT_ITEM_INFO_RECORD[recipe.product];
      
      // Header

      const headerElem = document.createElement("div");
      headerElem.className = "header";
      craftingAreaElem.appendChild(headerElem);

      const recipeProductNameElem = document.createElement("div");
      recipeProductNameElem.className = "recipe-product-name";
      recipeProductNameElem.textContent = productInfo.name;
      headerElem.appendChild(recipeProductNameElem);

      const itemImg = document.createElement("img");
      itemImg.className = "recipe-product-icon";
      itemImg.src = getItemTypeImage(recipe.product);
      headerElem.appendChild(itemImg);

      // Content

      const contentElem = document.createElement("div");
      contentElem.className = "content";
      craftingAreaElem.appendChild(contentElem);

      const recipeProductDescriptionElem = document.createElement("div");
      recipeProductDescriptionElem.className = "recipe-product-description";
      recipeProductDescriptionElem.textContent = productInfo.description;
      contentElem.appendChild(recipeProductDescriptionElem);

      const ingredientsTitleElem = document.createElement("div");
      ingredientsTitleElem.className = "ingredients-title";
      ingredientsTitleElem.textContent = "INGREDIENTS";
      contentElem.appendChild(ingredientsTitleElem);

      const ingredientsElem = document.createElement("ul");
      ingredientsElem.className = "ingredients";
      contentElem.appendChild(ingredientsElem);

      for (const ingredient of recipe.ingredients.getEntries()) {
         const ingredientElem = document.createElement("li");
         ingredientElem.className = "ingredient";
         ingredientsElem.appendChild(ingredientElem);

         const wrapper = document.createElement("div");
         wrapper.className = "wrapper";
         ingredientElem.appendChild(wrapper);

         const itemTypeText = document.createElement("p");
         itemTypeText.textContent = CLIENT_ITEM_INFO_RECORD[ingredient.itemType].name;
         wrapper.appendChild(itemTypeText);

         const iconImg = document.createElement("img");
         iconImg.className = "ingredient-icon";
         iconImg.src = getItemTypeImage(ingredient.itemType);
         wrapper.appendChild(iconImg);

         const ingredientCountElem = document.createElement("span");
         ingredientCountElem.className = "ingredient-count";
         ingredientCountElem.textContent = "x" + ingredient.count;
         ingredientElem.appendChild(ingredientCountElem);
      }

// @Incomplete!! The "not-enough"
//    <span class="ingredient-count" class:not-enough={!playerHasEnoughIngredients}>x{props.amountRequiredForRecipe}</span>

      // Bottom

      const bottomElem = document.createElement("div");
      bottomElem.className = "bottom";
      craftingAreaElem.appendChild(bottomElem);

      const craftButton = document.createElement("button");
      craftButton.className = "craft-button";
      if (craftableRecipes.indexOf(selectedRecipeIdx) !== -1) {
         craftButton.classList.add("craftable");
      }
      craftButton.textContent = "CRAFT";
      craftButton.onclick = craftRecipe;
      bottomElem.appendChild(craftButton);

      assert(playerInstance !== null);
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
      const craftingOutputSlot = getInventory(inventoryComponent, InventoryName.craftingOutputSlot)!;
      
      const craftingOutputSlotElem = createItemSlot();
      const craftingOutput = craftingOutputSlot.getItem(1);
      if (craftingOutput !== null) {
         addItemToItemSlot(craftingOutputSlotElem, craftingOutput.type, craftingOutput.count);
      }
      makeItemSlotInteractable(craftingOutputSlotElem, playerInstance, craftingOutputSlot, 1);
      bottomElem.appendChild(craftingOutputSlotElem);

   // @Incomplete?
   //       <div class="content">
   //          <div class="recipe-product-description">{CLIENT_ITEM_INFO_RECORD[selectedRecipe.recipe.product].description}</div>

   //          <div class="ingredients-title">INGREDIENTS</div>
   //          <CraftingIngredients hotbar={inventoryState.hotbar} recipe={selectedRecipe.recipe} />
   //       </div>

   //       <div class="bottom">
   //          <button onclick={craftRecipe} class="craft-button" class:craftable={craftableRecipes.includes(selectedRecipe)}>CRAFT</button>
   //          <!-- <EntityInteractableItemSlot class="crafting-output" entity={playerInstance!} inventory={inventoryState.craftingOutputSlot} itemSlot={1} validItemSpecifier={() => false} /> -->
   //          <EntityInteractableItemSlot entity={playerInstance!} inventory={inventoryState.craftingOutputSlot} itemSlot={1} validItemSpecifier={() => false} />
   //       </div>
   } else {
      const selectMessageElem = document.createElement("div");
      selectMessageElem.className = "select-message";
      selectMessageElem.textContent = "(Select a recipe to view)";
      craftingAreaElem.appendChild(selectMessageElem);
   }
}

export function openCraftingMenu(): void {
   assert(craftingMenuElem === null);

   const selectedEntity = getSelectedEntity();
   const craftingStation = selectedEntity !== null ? getEntityType(selectedEntity) as CraftingStationEntityType : null;

   // Get all available recipes
   availableRecipes.length = 0; // @Garbage
   // @Speed: loops through all recipes
   for (let i = 0; i < CRAFTING_RECIPES.length; i++) {
      const recipe = CRAFTING_RECIPES[i];
      // Make sure the crafting station is right
      if (craftingStation !== (recipe.craftingStation || null)) {
         continue;
      }
      
      // Make sure the player has the tech
      const techRequired = getTechRequiredForItem(recipe.product);
      if (techRequired === null || playerTribe.unlockedTechs.includes(techRequired)) {
         availableRecipes.push(i);
      }
   }

   const elem = document.createElement("div");
   elem.id = "crafting-menu";
   elem.className = "menu";

   const recipeBrowserElem = document.createElement("div");
   recipeBrowserElem.className = "recipe-browser";
   elem.appendChild(recipeBrowserElem);

   const recipeBrowserHeight = Math.max(Var.RECIPE_BROWSER_MIN_HEIGHT, Math.ceil(availableRecipes.length / Var.RECIPE_BROWSER_WIDTH));

   const recipeBrowserItemSlots = createInventoryContainer(false, Var.RECIPE_BROWSER_WIDTH);
   recipeBrowserItemSlots.onmousedown = clickRecipeSlot;
   recipeBrowserElem.appendChild(recipeBrowserItemSlots);

   const recipeBrowserNumItemSlots = recipeBrowserHeight * Var.RECIPE_BROWSER_WIDTH;
   // Recipe slots
   for (const recipeIdx of availableRecipes) {
      const itemSlotElem = createItemSlot();
      if (recipeIdx === selectedRecipeIdx) {
         addItemSlotElemSelection(itemSlotElem);
      }
      if (craftableRecipes.indexOf(recipeIdx) !== -1) {
         itemSlotElem.classList.add("craftable");
      }

      const recipe = CRAFTING_RECIPES[recipeIdx];
      addItemToItemSlot(itemSlotElem, recipe.product, recipe.yield);

      recipeBrowserItemSlots.appendChild(itemSlotElem);
   }
   // Empty slots
   for (let i = 0; i < recipeBrowserNumItemSlots - availableRecipes.length; i++) {
      const itemSlotElem = createItemSlot();
      recipeBrowserItemSlots.appendChild(itemSlotElem);
   }

   const craftingAreaElem = document.createElement("div");
   craftingAreaElem.className = "crafting-area";
   elem.appendChild(craftingAreaElem);
   createCraftingArea(craftingAreaElem);

   document.body.appendChild(elem);
   craftingMenuElem = elem;
}

export function closeCraftingMenu(): void {
   assert(craftingMenuElem !== null);
   craftingMenuElem.remove();
   craftingMenuElem = null;
}

// @INCOMPLETE!!!
// if (import.meta.hot) {
//    openCraftingMenu();

//    import.meta.hot.dispose(data => {
//       closeCraftingMenu();
//       import.meta.hot.data
//    });
   
//    import.meta.hot.accept();
// }