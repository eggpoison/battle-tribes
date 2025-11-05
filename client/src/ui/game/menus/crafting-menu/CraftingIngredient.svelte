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