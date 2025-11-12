<script lang="ts">
   import { Inventory, Item, ItemTally2, tallyInventoryItems, type CraftingRecipe, CRAFTING_RECIPES, type CraftingStationEntityType, getTechRequiredForItem } from "webgl-test-shared";
   import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../../game/client-item-info";
   import { playHeadSound } from "../../../../game/sound";
   import { sendCraftItemPacket } from "../../../../game/networking/packet-sending";
   import { playerTribe } from "../../../../game/tribes";
   import { playerInstance } from "../../../../game/player";
   import ItemSlot from "../../inventories/ItemSlot.svelte";
   import CraftingIngredients from "./CraftingIngredients.svelte";
   import { entitySelectionState } from "../../../../ui-state/entity-selection-state.svelte";
   import { getEntityType } from "../../../../game/world";
   import RecipeViewer from "./RecipeViewer.svelte";
   import { inventoryState } from "../../../../ui-state/inventory-state.svelte";
   import EntityInteractableItemSlot from "../../inventories/EntityInteractableItemSlot.svelte";
   import ItemSlotsContainer from "../../inventories/ItemSlotsContainer.svelte";
   import MenuElem from "../MenuElem.svelte";

   interface RecipeInfo {
      readonly recipe: CraftingRecipe;
      readonly idx: number;
   }
   
   const selectedEntity = entitySelectionState.selectedEntity;
   const craftingStation = selectedEntity !== null ? getEntityType(selectedEntity) as CraftingStationEntityType : null;

   const availableRecipes = $state(new Array<RecipeInfo>());
   
   let selectedRecipe = $state<RecipeInfo | null>(null);
   
   let hoveredRecipe = $state<RecipeInfo | null>(null);
   let recipeViewerOffsetY = $state(0);

   // Get all available recipes
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
         availableRecipes.push({
            recipe: recipe,
            idx: i
         });
      }
   }
   
   const getCraftableRecipes = (hotbar: Inventory, backpack: Inventory): ReadonlyArray<RecipeInfo> => {
      const availableItemsTally = new ItemTally2();
      tallyInventoryItems(availableItemsTally, hotbar);
      if (backpack !== null) {
         tallyInventoryItems(availableItemsTally, backpack);
      }
      
      const craftableRecipes = new Array<RecipeInfo>();
      for (const recipe of availableRecipes) {
         if (availableItemsTally.fullyCoversOtherTally(recipe.recipe.ingredients)) {
            craftableRecipes.push(recipe);
         }
      }

      return craftableRecipes;
   }

   const craftableRecipes = $derived(getCraftableRecipes(inventoryState.hotbar, inventoryState.backpack));

   const craftRecipe = (): void => {
      if (selectedRecipe === null || !craftableRecipes.includes(selectedRecipe)) {
         return;
      }

      playHeadSound("craft.mp3", 0.25, 1);

      sendCraftItemPacket(selectedRecipe.idx);
   }

   const onRecipeBrowserMouseMove = (e: MouseEvent): void => {
      recipeViewerOffsetY = e.clientY;
   }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<MenuElem id="crafting-menu" oncontextmenu={e => e.preventDefault()}>
   <div class="recipe-browser">
      <ItemSlotsContainer width={3} height={undefined} minHeight={5} numItemSlotsPassed={availableRecipes.length} onmousemove={onRecipeBrowserMouseMove}>
         {#each availableRecipes as recipe}
            {@const item = new Item(recipe.recipe.product, recipe.recipe.yield, 0)}
            <ItemSlot class={craftableRecipes.includes(recipe) ? "craftable" : undefined} {item} isSelected={recipe === selectedRecipe} onmouseover={() => hoveredRecipe = recipe} onmouseout={() => hoveredRecipe = null} onmousedown={() => selectedRecipe = recipe} />
         {/each}
      </ItemSlotsContainer>
   </div>

   <div class="crafting-area">
      {#if selectedRecipe !== null}
         <div class="header">
            <div class="recipe-product-name">{CLIENT_ITEM_INFO_RECORD[selectedRecipe.recipe.product].name}</div>
            <img src={getItemTypeImage(selectedRecipe.recipe.product)} class="recipe-product-icon" alt="" />
         </div>

         <div class="content">
            <div class="recipe-product-description">{CLIENT_ITEM_INFO_RECORD[selectedRecipe.recipe.product].description}</div>

            <div class="ingredients-title">INGREDIENTS</div>
            <CraftingIngredients hotbar={inventoryState.hotbar} recipe={selectedRecipe.recipe} />
         </div>

         <div class="bottom">
            <button onclick={craftRecipe} class="craft-button" class:craftable={craftableRecipes.includes(selectedRecipe)}>CRAFT</button>
            <!-- <EntityInteractableItemSlot class="crafting-output" entityID={playerInstance!} inventory={inventoryState.craftingOutputSlot} itemSlot={1} validItemSpecifier={() => false} /> -->
            <EntityInteractableItemSlot entity={playerInstance!} inventory={inventoryState.craftingOutputSlot} itemSlot={1} validItemSpecifier={() => false} />
         </div>
      {:else}
         <div class="select-message">&#40;Select a recipe to view&#41;</div>
      {/if}
   </div>

   {#if hoveredRecipe !== null}
      <RecipeViewer recipe={hoveredRecipe.recipe} offsetY={recipeViewerOffsetY} />
   {/if}
</MenuElem>