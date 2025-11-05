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