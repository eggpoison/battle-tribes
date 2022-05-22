import { ItemName } from "../items/items";
import Recipe from "./Recipe";

type RecipeTypes = "hand" | "campfire" | "workbench";

type Recipes = Record<RecipeTypes, ReadonlyArray<Recipe>>;

abstract class Crafting {
   private static readonly recipes: Recipes = {
      hand: [
         new Recipe(ItemName.smallBackpack, {
            [ItemName.wood]: 10,
            [ItemName.leather]: 5,
            [ItemName.slime]: 2
         }, 1)
      ],
      campfire: [
         new Recipe(ItemName.woodenPickaxe, {
            [ItemName.wood]: 10
         }, 1),
         new Recipe(ItemName.woodenAxe, {
            [ItemName.wood]: 10
         }, 1),
         new Recipe(ItemName.woodenSword, {
            [ItemName.wood]: 15
         }, 1)
      ],
      workbench: []
   };

   public static getRecipeList(type?: RecipeTypes): ReadonlyArray<Recipe> {
      if (typeof type !== "undefined") {
         return this.recipes[type];
      } else {
         let recipes = new Array<Recipe>();

         for (const recipeList of Object.values(this.recipes)) {
            recipes = recipes.concat(recipeList);
         }

         return recipes;
      }
   }
}

export default Crafting;