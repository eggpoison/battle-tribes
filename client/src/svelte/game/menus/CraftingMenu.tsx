import { getTechRequiredForItem } from "battletribes-shared/techs";
import { useCallback, useEffect, useRef, useState } from "react";
import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../game/client-item-info";
import { windowHeight } from "../../../game/webgl";
import ItemSlot, { ItemSlotCallbackInfo } from "../inventories/ItemSlot";
import { countItemTypesInInventory } from "../../../game/inventory-manipulation";
import { playHeadSound } from "../../../game/sound";
import { CraftingRecipe, CRAFTING_RECIPES, forceGetItemRecipe, CraftingStationEntityType } from "battletribes-shared/items/crafting-recipes";
import { ItemType, Item, Inventory, InventoryName } from "battletribes-shared/items/items";
import { ItemTally2, tallyInventoryItems } from "battletribes-shared/items/ItemTally";
import InventoryContainer from "../inventories/InventoryContainer";
import { deselectHighlightedEntity } from "../../../game/entity-selection";
import { addMenuCloseFunction } from "../../../game/menus";
import { TransformComponentArray } from "../../../game/entity-components/server-components/TransformComponent";
import { sendCraftItemPacket, sendItemDropPacket } from "../../../game/networking/packet-sending";
import { playerTribe } from "../../../game/tribes";
import { playerInstance } from "../../../game/player";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { EntityType } from "../../../../../shared/src/entities";

interface RecipeViewerProps {
   readonly recipe: CraftingRecipe;
   readonly hoverPosition: [number, number];
   readonly craftingMenuHeight: number;
}

interface CraftingMenuProps {
   readonly craftingOutputSlot: Inventory;
   readonly hotbar: Inventory;
   readonly backpack: Inventory;
}

// @Temporary? @Robustness
const CRAFTING_STATION_ICON_TEXTURE_SOURCES: Record<CraftingStationEntityType, string> = {
   [EntityType.workbench]: CLIENT_ITEM_INFO_RECORD[ItemType.workbench].textureSource,
   [EntityType.slime]: CLIENT_ITEM_INFO_RECORD[ItemType.slimeball].textureSource,
   [EntityType.frostshaper]: CLIENT_ITEM_INFO_RECORD[ItemType.frostshaper].textureSource,
   [EntityType.stonecarvingTable]: CLIENT_ITEM_INFO_RECORD[ItemType.stonecarvingTable].textureSource,
   [EntityType.automatonAssembler]: CLIENT_ITEM_INFO_RECORD[ItemType.automatonAssembler].textureSource,
   [EntityType.mithrilAnvil]: CLIENT_ITEM_INFO_RECORD[ItemType.automatonAssembler].textureSource,
};

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
   readonly hotbar: Inventory;
   readonly ingredientType: ItemType;
   readonly amountRequiredForRecipe: number;
}
/**
 * An ingredient in an item's recipe.
 */
const Ingredient = (props: IngredientProps) => {
   const [tooltipIsShown, setTooltipIsShown] = useState(false);
   
   const itemIconSource = getItemTypeImage(props.ingredientType);

   // Find whether the player has enough available ingredients to craft the recipe
   const numIngredientsAvailableToPlayer = countItemTypesInInventory(props.hotbar, props.ingredientType);
   const playerHasEnoughIngredients = numIngredientsAvailableToPlayer >= props.amountRequiredForRecipe;

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
               <span>{CLIENT_ITEM_INFO_RECORD[props.ingredientType].name}</span>
            </div>
         ) : null}
      </div>
      <span className={`ingredient-count${!playerHasEnoughIngredients ? " not-enough" : ""}`}>x{props.amountRequiredForRecipe}</span>
   </li>;
};

interface IngredientsProps {
   readonly hotbar: Inventory;
   readonly recipe: CraftingRecipe;
}
/**
 * The list of ingredients in a recipe required to craft it.
 */
const Ingredients = (props: IngredientsProps) => {
   const ingredientElements = props.recipe.ingredients.getEntries().map((entry, i) => {
      return <Ingredient hotbar={props.hotbar} ingredientType={entry.itemType} amountRequiredForRecipe={entry.count} key={i} />
   });

   return <ul className="ingredients">
      {ingredientElements}
   </ul>
}

const RECIPE_BROWSER_WIDTH = 3;
const MIN_RECIPE_BROWSER_HEIGHT = 9;

export let setCraftingMenuAvailableRecipes: (craftingRecipes: Array<CraftingRecipe>) => void = () => {};
export let setCraftingMenuAvailableCraftingStations: (craftingStations: Set<CraftingStationEntityType>) => void = () => {};
export let CraftingMenu_setCraftingStation: (craftingStation: CraftingStationEntityType | null) => void = () => {};
export let CraftingMenu_setIsVisible: (isVisible: boolean) => void = () => {};

export let craftingMenuIsOpen: () => boolean;

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

const CraftingMenu = (props: CraftingMenuProps) => {
   const [isVisible, setIsVisible] = useState(false);
   const [craftingStation, setCraftingStation] = useState<CraftingStationEntityType | null>(null);

   // const [availableRecipes, setAvailableRecipes] = useState(new Array<CraftingRecipe>());
   // const [availableCraftingStations, setAvailableCraftingStations] = useState(new Set<CraftingStation>());

   const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
   const selectedRecipeIndex = useRef(-1);
   
   const [hoveredRecipe, setHoveredRecipe] = useState<CraftingRecipe | null>(null);
   const [hoverPosition, setHoverPosition] = useState<[number, number] | null>(null);
   const craftingMenuRef = useRef<HTMLDivElement | null>(null);
   const craftingMenuHeightRef = useRef<number | null>(null);

   const craftableRecipes = getCraftableRecipes(props.hotbar, props.backpack, craftingStation);

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
      if (selectedRecipe === null || !craftableRecipes.includes(selectedRecipe)) {
         return;
      }

      playHeadSound("craft.mp3", 0.25, 1);
      sendCraftItemPacket(selectedRecipeIndex.current);
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

   useEffect(() => {
      // @Temporary
      setCraftingMenuAvailableRecipes = (recipes: Array<CraftingRecipe>): void => {
         // setAvailableRecipes(recipes);
      }

      // @Temporary
      setCraftingMenuAvailableCraftingStations = (craftingStations: Set<CraftingStationEntityType>): void => {
         // setAvailableCraftingStations(craftingStations);
      }

      CraftingMenu_setCraftingStation = (craftingStation: CraftingStationEntityType | null): void => {
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

            // @INVESTIGATE: this might actually be bad for gameplay, cuz what if you randomly drop something or someone attacks you while you're doing something and you're forced to find a place to put your held item...
            // When the crafting menu is closed, if an item was being dragged, drop the item
            if (playerInstance !== null) {
               const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
               if (inventoryComponent !== null) {
                  const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
                  const heldItem = heldItemInventory.itemSlots[1];
                  if (typeof heldItem !== "undefined") {
                     const transformComponent = TransformComponentArray.getComponent(playerInstance)!;
                     const hitbox = transformComponent.hitboxes[0];
                     sendItemDropPacket(InventoryName.heldItemSlot, 1, heldItem.count, hitbox.box.angle);
                  }
               }
            }
         });
      }
      
      craftingMenuIsOpen = (): boolean => {
         return isVisible;
      }
   }, [isVisible]);

   if (!isVisible) return null;

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

   return <div id="crafting-menu" className="inventory" onContextMenu={e => e.preventDefault()} ref={onCraftingMenuRefChange}>
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
               
               <Ingredients hotbar={props.hotbar} recipe={selectedRecipe} />
            </div>

            <div className="bottom">
               <button onClick={craftRecipe} className={`craft-button${craftableRecipes.includes(selectedRecipe) ? " craftable" : ""}`}>CRAFT</button>
               <ItemSlot className="crafting-output" entityID={playerInstance!} inventory={props.craftingOutputSlot} itemSlot={1} validItemSpecifier={() => false} />
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