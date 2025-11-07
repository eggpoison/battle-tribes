<script lang="ts">
   import { EntityType, Inventory, Item, ItemTally2, tallyInventoryItems, ItemType, InventoryName, type CraftingRecipe, CRAFTING_RECIPES, forceGetItemRecipe, type CraftingStationEntityType, getTechRequiredForItem } from "webgl-test-shared";
   import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../../game/client-item-info";
   import { playHeadSound } from "../../../../game/sound";
   import { sendCraftItemPacket, sendItemDropPacket } from "../../../../game/networking/packet-sending";
   import { playerTribe } from "../../../../game/tribes";
   import { playerInstance } from "../../../../game/player";
   import ItemSlot from "../../inventories/ItemSlot.svelte";
   import InventoryContainer from "../../inventories/ItemSlotsContainer.svelte";
   import CraftingIngredients from "./CraftingIngredients.svelte";
   import { entityInteractionState } from "../../../../ui-state/entity-interaction-state.svelte";
   import { getEntityType } from "../../../../game/world";
   import RecipeViewer from "./RecipeViewer.svelte";
   import { inventoryState } from "../../../../ui-state/inventory-state.svelte";
   import { type ItemSlotCallbackInfo } from "../../inventories/EntityInteractableItemSlot.svelte";

   // @Temporary? @Robustness
   const CRAFTING_STATION_ICON_TEXTURE_SOURCES: Record<CraftingStationEntityType, string> = {
      [EntityType.workbench]: CLIENT_ITEM_INFO_RECORD[ItemType.workbench].textureSource,
      [EntityType.slime]: CLIENT_ITEM_INFO_RECORD[ItemType.slimeball].textureSource,
      [EntityType.frostshaper]: CLIENT_ITEM_INFO_RECORD[ItemType.frostshaper].textureSource,
      [EntityType.stonecarvingTable]: CLIENT_ITEM_INFO_RECORD[ItemType.stonecarvingTable].textureSource,
      [EntityType.automatonAssembler]: CLIENT_ITEM_INFO_RECORD[ItemType.automatonAssembler].textureSource,
      [EntityType.mithrilAnvil]: CLIENT_ITEM_INFO_RECORD[ItemType.automatonAssembler].textureSource,
   };

   const RECIPE_BROWSER_WIDTH = 3;
   const MIN_RECIPE_BROWSER_HEIGHT = 9;

   const selectedEntity = entityInteractionState.selectedEntity;
   const craftingStation = selectedEntity !== null ? getEntityType(selectedEntity) as CraftingStationEntityType : null;

   // const [availableRecipes, setAvailableRecipes] = useState(new Array<CraftingRecipe>());
   // const [availableCraftingStations, setAvailableCraftingStations] = useState(new Set<CraftingStation>());

   let selectedRecipe = $state<CraftingRecipe | null>(null);
   
   let hoveredRecipe = $state<CraftingRecipe | null>(null);
   let hoverPosition = $state<[number, number] | null>(null);
   
   const getCraftableRecipes = (hotbar: Inventory, backpack: Inventory, craftingStation: CraftingStationEntityType | null): ReadonlyArray<CraftingRecipe> => {
      if (playerInstance === null) {
         return [];
      }
      
      const availableItemsTally = new ItemTally2();
      tallyInventoryItems(availableItemsTally, hotbar);
      if (backpack !== null) {
         tallyInventoryItems(availableItemsTally, backpack);
      }
      
      const craftableRecipes = new Array<CraftingRecipe>();
      for (const recipe of CRAFTING_RECIPES) {
         // @Cleanup: negate
         // Make sure the recipe is craftable by the current station
         if (!((typeof recipe.craftingStation === "undefined" && craftingStation === null) || (recipe.craftingStation === craftingStation))) {
            continue;
         }
         
         if (availableItemsTally.fullyCoversOtherTally(recipe.ingredients)) {
            craftableRecipes.push(recipe);
         }
      }

      return craftableRecipes;
   }

   const craftableRecipes = getCraftableRecipes(inventoryState.hotbar, inventoryState.backpack, craftingStation);

   const selectRecipe = (_: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void => {
      if (callbackInfo.itemType === null) {
         return;
      }
      
      const recipe = forceGetItemRecipe(callbackInfo.itemType);
      selectedRecipe = recipe;
   }

   const craftRecipe = (): void => {
      if (selectedRecipe === null || !craftableRecipes.includes(selectedRecipe)) {
         return;
      }

      playHeadSound("craft.mp3", 0.25, 1);

      const idx = CRAFTING_RECIPES.indexOf(selectedRecipe);
      sendCraftItemPacket(idx);
   }

   const hoverRecipe = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void => {
      if (callbackInfo.itemType === null) {
         return;
      }
      
      const recipe = forceGetItemRecipe(callbackInfo.itemType);
      hoveredRecipe = recipe;
      if (hoverPosition === null) {
         hoverPosition = [e.clientX, e.clientY];
      } else {
         hoverPosition[0] = e.clientX;
         hoverPosition[1] = e.clientY;
      }
   }

   const unhoverRecipe = (): void => {
      hoveredRecipe = null;
   }

   const mouseMove = (e: MouseEvent): void => {
      if (hoverPosition === null) {
         hoverPosition = [e.clientX, e.clientY];
      } else {
         hoverPosition[0] = e.clientX;
         hoverPosition[1] = e.clientY;
      }
   }
   
   // Get all available recipes
   const availableRecipes = new Array<CraftingRecipe>();
   for (const recipe of CRAFTING_RECIPES) {
      if (craftingStation === null) {
         if (typeof recipe.craftingStation === "undefined") {
            availableRecipes.push(recipe);
         }
      } else {
         if (typeof recipe.craftingStation !== "undefined") {
            availableRecipes.push(recipe);
         }
      }
   }

   // Filter out recipes which the player doesn't have the tech for
   for (let i = 0; i < availableRecipes.length; i++) {
      const recipe = availableRecipes[i];

      const techRequired = getTechRequiredForItem(recipe.product);
      if (techRequired !== null && !playerTribe.unlockedTechs.includes(techRequired)) {
         availableRecipes.splice(i, 1);
         i--;
      }
   }

   // @Incomplete: height doesn't match with actual #
   const browserHeight = Math.max(MIN_RECIPE_BROWSER_HEIGHT, Math.ceil(availableRecipes.length / RECIPE_BROWSER_WIDTH));
   
   // Create the recipe browser inventory
   let selectedRecipeItemSlot: number | undefined;
   const recipeBrowserInventory = new Inventory(RECIPE_BROWSER_WIDTH, browserHeight, 0);
   for (let i = 0; i < availableRecipes.length; i++) {
      const recipe = availableRecipes[i];
      const itemSlot = i + 1;

      const item = new Item(recipe.product, recipe.yield, 0);
      recipeBrowserInventory.addItem(item, itemSlot);

      if (recipe === selectedRecipe) {
         selectedRecipeItemSlot = itemSlot;
      }
   }

   const getItemSlotClassName = (callbackInfo: ItemSlotCallbackInfo): string | undefined => {
      if (callbackInfo.itemType === null) {
         return undefined;
      }

      const recipe = forceGetItemRecipe(callbackInfo.itemType);
      const isCraftable = craftableRecipes.includes(recipe);
      return isCraftable ? "craftable" : undefined;
   }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div id="crafting-menu" class="inventory" oncontextmenu={e => e.preventDefault()}>
   <!--
   // @Temporary?
   <div className="available-crafting-stations">
      {Array.from(availableCraftingStations).map((craftingStationType: CraftingStation, i: number) => {
         const image = require("../../../images/" + CRAFTING_STATION_ICON_TEXTURE_SOURCES[craftingStationType]);
         return <img className="crafting-station-image" src={image} key={i} alt="" />
      })}
   </div>
   -->

   <div class="recipe-browser">
      <InventoryContainer entityID={0} inventory={recipeBrowserInventory} isManipulable={false} selectedItemSlot={selectedRecipeItemSlot} onMouseOver={hoverRecipe} onMouseOut={unhoverRecipe} onMouseMove={mouseMove} itemSlotClassNameCallback={getItemSlotClassName} onMouseDown={selectRecipe} />
   </div>

   <div class="crafting-area">
      {#if selectedRecipe !== null}
         <div class="header">
            <div class="recipe-product-name">{CLIENT_ITEM_INFO_RECORD[selectedRecipe.product].name}</div>
            <img src={getItemTypeImage(selectedRecipe.product)} class="recipe-product-icon" alt="" />
         </div>

         <div class="content">
            <div class="recipe-product-description">{CLIENT_ITEM_INFO_RECORD[selectedRecipe.product].description}</div>

            <div class="ingredients-title">INGREDIENTS</div>
            
            <CraftingIngredients hotbar={inventoryState.hotbar} recipe={selectedRecipe} />
         </div>

         <div class="bottom">
            <button onclick={craftRecipe} class="craft-button" class:craftable={craftableRecipes.includes(selectedRecipe)}>CRAFT</button>
            <ItemSlot class="crafting-output" entityID={playerInstance!} inventory={inventoryState.craftingOutputSlot} itemSlot={1} validItemSpecifier={() => false} />
         </div>
      {:else}
         <div class="select-message">&#40;Select a recipe to view&#41;</div>
      {/if}
   </div>

   {#if hoveredRecipe !== null && hoverPosition !== null}
      <!-- @SQUEAM trying out dynamicalls!! -->
      <!-- <RecipeViewer recipe={hoveredRecipe} hoverPositionX={hoverPosition![0]} hoverPositionY={hoverPosition![1]} craftingMenuHeight={craftingMenuHeightRef.current!} /> -->
      <RecipeViewer recipe={hoveredRecipe} hoverPositionX={hoverPosition![0]} hoverPositionY={hoverPosition![1]} craftingMenuHeight={0} />
   {/if}
</div>