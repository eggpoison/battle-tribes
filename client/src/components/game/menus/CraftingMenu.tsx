import { getTechRequiredForItem } from "battletribes-shared/techs";
import { useCallback, useEffect, useRef, useState } from "react";
import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../client-item-info";
import Client from "../../../client/Client";
import { windowHeight } from "../../../webgl";
import ItemSlot, { ItemSlotCallbackInfo } from "../inventories/ItemSlot";
import { countItemTypesInInventory } from "../../../inventory-manipulation";
import Player from "../../../entities/Player";
import Game from "../../../Game";
import { playSound } from "../../../sound";
import { CraftingRecipe, CraftingStation, CRAFTING_RECIPES, forceGetItemRecipe } from "battletribes-shared/items/crafting-recipes";
import { ItemType, Item, Inventory, InventoryName } from "battletribes-shared/items/items";
import { ItemTally2, tallyInventoryItems } from "battletribes-shared/items/ItemTally";
import InventoryContainer from "../inventories/InventoryContainer";
import { deselectHighlightedEntity } from "../../../entity-selection";
import { addMenuCloseFunction } from "../../../menus";
import { ServerComponentType } from "battletribes-shared/components";
import { InventoryComponentArray } from "../../../entity-components/InventoryComponent";

interface RecipeViewerProps {
   readonly recipe: CraftingRecipe;
   readonly hoverPosition: [number, number];
   readonly craftingMenuHeight: number;
}

// @Temporary?
const CRAFTING_STATION_ICON_TEXTURE_SOURCES: Record<CraftingStation, string> = {
   [CraftingStation.workbench]: CLIENT_ITEM_INFO_RECORD[ItemType.workbench].textureSource,
   [CraftingStation.slime]: CLIENT_ITEM_INFO_RECORD[ItemType.slimeball].textureSource,
   [CraftingStation.water]: "miscellaneous/water-droplet.png",
   [CraftingStation.frostshaper]: CLIENT_ITEM_INFO_RECORD[ItemType.frostshaper].textureSource,
   [CraftingStation.stonecarvingTable]: CLIENT_ITEM_INFO_RECORD[ItemType.stonecarvingTable].textureSource
};

const CRAFTING_RECIPE_RECORD: Record<CraftingStation | "hand", Array<CraftingRecipe>> = {
   hand: [],
   [CraftingStation.workbench]: [],
   [CraftingStation.slime]: [],
   [CraftingStation.water]: [],
   [CraftingStation.frostshaper]: [],
   [CraftingStation.stonecarvingTable]: []
};

// Categorise the crafting recipes
for (const craftingRecipe of CRAFTING_RECIPES) {
   if (typeof craftingRecipe.craftingStation === "undefined") {
      CRAFTING_RECIPE_RECORD.hand.push(craftingRecipe);
   } else {
      CRAFTING_RECIPE_RECORD[craftingRecipe.craftingStation].push(craftingRecipe);
   }
}

const RecipeViewer = ({ recipe, hoverPosition, craftingMenuHeight }: RecipeViewerProps) => {
   const recipeViewerRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      if (recipeViewerRef.current !== null) {
         const top = (windowHeight - craftingMenuHeight) / 2;
         recipeViewerRef.current.style.top = (hoverPosition[1] - top) + "px";
      }
   }, [hoverPosition, craftingMenuHeight]);
   
   return <div className="recipe-viewer" ref={recipeViewerRef}>
      <div className="header">
         <img className="recipe-product-icon" src={getItemTypeImage(recipe.product)} alt="" />
         <div className="recipe-product-name">{CLIENT_ITEM_INFO_RECORD[recipe.product].name}</div>
      </div>

      <ul className="ingredients">
         {recipe.ingredients.getEntries().map((entry, i: number) => {
            return <li className="ingredient" key={i}>
               <img className="ingredient-icon" src={getItemTypeImage(entry.itemType)} alt="" />
               <span className="ingredient-count">x{entry.count}</span>
            </li>;
         })}
      </ul>

      <div className="splitter"></div>

      <div className="caption">Click to open</div>
   </div>;
}

interface IngredientProps {
   readonly ingredientType: ItemType;
   readonly amountRequiredForRecipe: number;
}
/**
 * An ingredient in an item's recipe.
 */
const Ingredient = ({ ingredientType, amountRequiredForRecipe }: IngredientProps) => {
   const [tooltipIsShown, setTooltipIsShown] = useState(false);
   
   const itemIconSource = getItemTypeImage(ingredientType);

   const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
   const hotbar = inventoryComponent.getInventory(InventoryName.hotbar)!;
   
   // Find whether the player has enough available ingredients to craft the recipe
   const numIngredientsAvailableToPlayer = countItemTypesInInventory(hotbar, ingredientType);
   const playerHasEnoughIngredients = numIngredientsAvailableToPlayer >= amountRequiredForRecipe;

   const showIngredientTooltip = () => {
      setTooltipIsShown(true);
   }
   
   const hideIngredientTooltip = () => {
      setTooltipIsShown(false);
   }

   return <li className="ingredient">
      <div className="ingredient-icon-wrapper" onMouseEnter={showIngredientTooltip} onMouseLeave={hideIngredientTooltip}>
         <img src={itemIconSource} className="ingredient-icon" alt="" />

         {tooltipIsShown ? (
            <div className="ingredient-tooltip">
               <span>{CLIENT_ITEM_INFO_RECORD[ingredientType].name}</span>
            </div>
         ) : null}
      </div>
      <span className={`ingredient-count${!playerHasEnoughIngredients ? " not-enough" : ""}`}>x{amountRequiredForRecipe}</span>
   </li>;
};

interface IngredientsProps {
   readonly recipe: CraftingRecipe;
}
/**
 * The list of ingredients in a recipe required to craft it.
 */
const Ingredients = ({ recipe }: IngredientsProps) => {
   const ingredientElements = recipe.ingredients.getEntries().map((entry, i) => {
      return <Ingredient ingredientType={entry.itemType} amountRequiredForRecipe={entry.count} key={i} />
   });

   return <ul className="ingredients">
      {ingredientElements}
   </ul>
}

const RECIPE_BROWSER_WIDTH = 3;
const MIN_RECIPE_BROWSER_HEIGHT = 9;

export let setCraftingMenuAvailableRecipes: (craftingRecipes: Array<CraftingRecipe>) => void = () => {};
export let setCraftingMenuAvailableCraftingStations: (craftingStations: Set<CraftingStation>) => void = () => {};
export let CraftingMenu_setCraftingMenuOutputItem: (item: Item | null) => void = () => {};
export let CraftingMenu_setCraftingStation: (craftingStation: CraftingStation | null) => void = () => {};
export let CraftingMenu_setIsVisible: (isVisible: boolean) => void;

export let craftingMenuIsOpen: () => boolean;

export let CraftingMenu_updateRecipes: () => void = () => {};

const CraftingMenu = () => {
   const [isVisible, setIsVisible] = useState(false);
   const [craftingStation, setCraftingStation] = useState<CraftingStation | null>(null);

   // const [availableRecipes, setAvailableRecipes] = useState(new Array<CraftingRecipe>());
   // const [availableCraftingStations, setAvailableCraftingStations] = useState(new Set<CraftingStation>());
   const [craftingOutputItemType, setCraftingOutputItemType] = useState<ItemType | null>(null);
   const [craftingOutputItemAmount, setCraftingOutputItemAmount] = useState<number>(0);

   const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
   const selectedRecipeIndex = useRef(-1);
   
   const craftableRecipes = useRef<Array<CraftingRecipe>>([]);
   const [hoveredRecipe, setHoveredRecipe] = useState<CraftingRecipe | null>(null);
   const [hoverPosition, setHoverPosition] = useState<[number, number] | null>(null);
   const craftingMenuRef = useRef<HTMLDivElement | null>(null);
   const craftingMenuHeightRef = useRef<number | null>(null);

   const onCraftingMenuRefChange = useCallback((node: HTMLDivElement | null) => {
      if (node !== null) {
         craftingMenuRef.current = node;
         craftingMenuHeightRef.current = craftingMenuRef.current.offsetHeight;
      }
   }, []);

   const selectRecipe = (_: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void => {
      if (callbackInfo.itemType === null) {
         return;
      }
      
      const recipe = forceGetItemRecipe(callbackInfo.itemType);
      setSelectedRecipe(recipe);
      selectedRecipeIndex.current = CRAFTING_RECIPES.indexOf(recipe);
   }

   const craftRecipe = useCallback((): void => {
      if (selectedRecipe === null || !craftableRecipes.current.includes(selectedRecipe)) {
         return;
      }

      const playerTransformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);

      playSound("craft.mp3", 0.25, 1, playerTransformComponent.position);
      Client.sendCraftingPacket(selectedRecipeIndex.current);
   }, [selectedRecipe, craftableRecipes]);

   const hoverRecipe = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void => {
      if (callbackInfo.itemType === null) {
         return;
      }
      
      const recipe = forceGetItemRecipe(callbackInfo.itemType);
      setHoveredRecipe(recipe);
      setHoverPosition([e.clientX, e.clientY]);
   }

   const unhoverRecipe = (): void => {
      setHoveredRecipe(null);
   }

   const mouseMove = (e: MouseEvent): void => {
      setHoverPosition([e.clientX, e.clientY]);
   }

   // @Incomplete?
   // const pickUpCraftingOutputItem = (e: MouseEvent): void => {
   //    leftClickItemSlot(e, Player.instance!.id, definiteGameState.craftingOutputSlot!, 1);
   // }

   CraftingMenu_updateRecipes = useCallback((): void => {
      if (Player.instance === null) {
         return;
      }
      
      const inventoryComponent = InventoryComponentArray.getComponent(Player.instance.id);
      const hotbar = inventoryComponent.getInventory(InventoryName.hotbar)!;
      const backpack = inventoryComponent.getInventory(InventoryName.backpack);
      
      const availableItemsTally = new ItemTally2();
      tallyInventoryItems(availableItemsTally, hotbar);
      if (backpack !== null) {
         tallyInventoryItems(availableItemsTally, backpack);
      }
      
      const craftableRecipesArray = new Array<CraftingRecipe>();
      for (const recipe of CRAFTING_RECIPES) {
         // @Cleanup: negate
         // Make sure the recipe is craftable by the current station
         if (!((typeof recipe.craftingStation === "undefined" && craftingStation === null) || (recipe.craftingStation === craftingStation))) {
            continue;
         }
         
         if (availableItemsTally.fullyCoversOtherTally(recipe.ingredients)) {
            craftableRecipesArray.push(recipe);
         }
      }

      craftableRecipes.current = craftableRecipesArray;
   }, [craftingStation]);

   // // Find which of the available recipes can be crafted
   // useEffect(() => {
   //    // Find which item slots are available for use in crafting
   //    const availableItemSlots = new Array<ItemSlots>();
   //    if (definiteGameState.hotbar !== null) {
   //       availableItemSlots.push(definiteGameState.hotbar.itemSlots);
   //    }
   //    if (definiteGameState.backpack !== null) {
   //       availableItemSlots.push(definiteGameState.backpack.itemSlots);
   //    }
      
   //    if (availableItemSlots.length === 0) {
   //       return;
   //    }
      
   //    const craftableRecipesArray = new Array<CraftingRecipe>();
   //    for (const recipe of availableRecipes) {
   //       if (hasEnoughItems(availableItemSlots, recipe.ingredients)) {
   //          craftableRecipesArray.push(recipe);
   //       }
   //    }

   //    craftableRecipes.current = craftableRecipesArray;
   // }, [availableRecipes]);

   // useEffect(() => {
   //    if (selectedRecipe !== null && !availableRecipes.includes(selectedRecipe)) {
   //       setSelectedRecipe(null);
   //       selectedRecipeIndex.current = -1;
   //    }
   // }, [availableRecipes, selectedRecipe]);

   useEffect(() => {
      // @Temporary
      setCraftingMenuAvailableRecipes = (recipes: Array<CraftingRecipe>): void => {
         // setAvailableRecipes(recipes);
      }

      // @Temporary
      setCraftingMenuAvailableCraftingStations = (craftingStations: Set<CraftingStation>): void => {
         // setAvailableCraftingStations(craftingStations);
      }

      CraftingMenu_setCraftingMenuOutputItem = (item: Item | null): void => {
         if (item !== null) {
            setCraftingOutputItemType(item.type);
            setCraftingOutputItemAmount(item.count);
         } else {
            setCraftingOutputItemType(null);
            setCraftingOutputItemAmount(0);
         }
      }

      CraftingMenu_setCraftingStation = (craftingStation: CraftingStation | null): void => {
         setCraftingStation(craftingStation);

         if (craftingStation !== null) {
            setHoveredRecipe(null);
            setHoverPosition(null);
         }
      }

      CraftingMenu_setIsVisible = (isVisible: boolean): void => {
         setIsVisible(isVisible);
      }
   }, []);

   useEffect(() => {
      if (isVisible) {
         addMenuCloseFunction(() => {
            if (craftingStation !== null) {
               deselectHighlightedEntity();
            }
            
            setIsVisible(false);
         });
      }
      
      craftingMenuIsOpen = (): boolean => {
         return isVisible;
      }
   }, [isVisible]);

   if (!isVisible) return null;

   let availableRecipes: Array<CraftingRecipe>;
   if (craftingStation === null) {
      availableRecipes = CRAFTING_RECIPE_RECORD.hand.slice();
   } else {
      availableRecipes = CRAFTING_RECIPE_RECORD[craftingStation].slice();
   }

   // Filter out recipes which the player doesn't have the tech for
   for (let i = 0; i < availableRecipes.length; i++) {
      const recipe = availableRecipes[i];

      const techRequired = getTechRequiredForItem(recipe.product);
      if (techRequired !== null && !Game.tribe.hasUnlockedTech(techRequired)) {
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
      const isCraftable = craftableRecipes.current.includes(recipe);
      return isCraftable ? "craftable" : undefined;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
   const craftingOutputSlot = inventoryComponent.getInventory(InventoryName.craftingOutputSlot)!;

   return <div id="crafting-menu" className="inventory" ref={onCraftingMenuRefChange}>
      {/*
      // @Temporary?
      <div className="available-crafting-stations">
         {Array.from(availableCraftingStations).map((craftingStationType: CraftingStation, i: number) => {
            const image = require("../../../images/" + CRAFTING_STATION_ICON_TEXTURE_SOURCES[craftingStationType]);
            return <img className="crafting-station-image" src={image} key={i} alt="" />
         })}
      </div>
      */}

      <div className="recipe-browser">
         <InventoryContainer entityID={0} inventory={recipeBrowserInventory} isManipulable={false} selectedItemSlot={selectedRecipeItemSlot} onMouseOver={hoverRecipe} onMouseOut={unhoverRecipe} onMouseMove={mouseMove} itemSlotClassNameCallback={getItemSlotClassName} onMouseDown={selectRecipe} />
      </div>

      <div className="crafting-area">
         {selectedRecipe !== null ? <>
            <div className="header">
               <div className="recipe-product-name">{CLIENT_ITEM_INFO_RECORD[selectedRecipe.product].name}</div>
               <img src={getItemTypeImage(selectedRecipe.product)} className="recipe-product-icon" alt="" />
            </div>

            <div className="content">
               <div className="recipe-product-description">{CLIENT_ITEM_INFO_RECORD[selectedRecipe.product].description}</div>

               <div className="ingredients-title">INGREDIENTS</div>
               
               <Ingredients recipe={selectedRecipe} />
            </div>

            <div className="bottom">
               <button onClick={craftRecipe} className={`craft-button${craftableRecipes.current.includes(selectedRecipe) ? " craftable" : ""}`}>CRAFT</button>
               <ItemSlot className="crafting-output" entityID={Player.instance!.id} inventory={craftingOutputSlot} itemSlot={1} validItemSpecifier={() => false} />
            </div>
         </> : <>
            <div className="select-message">&#40;Select a recipe to view&#41;</div>
         </>}
      </div>

      {hoveredRecipe !== null ? (
         <RecipeViewer recipe={hoveredRecipe} hoverPosition={hoverPosition!} craftingMenuHeight={craftingMenuHeightRef.current!} />
      ) : null}
   </div>;
}

export default CraftingMenu;