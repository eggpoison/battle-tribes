import { ItemName } from "../items";
import Recipe from "./Recipe";

interface RecipeInfo {

}

type RecipeTypes = "hand" | "campfire" | "workbench";

type Recipes = Record<RecipeTypes, Array<Recipe>>;

abstract class Crafting {
    private static readonly recipes: Recipes = {
        hand: [
            new Recipe(ItemName.smallBackpack, {
                [ItemName.leather]: 5,
                [ItemName.slime]: 2
            })
        ],
        campfire: [],
        workbench: []
    };

    public static getRecipeList(type: RecipeTypes): Array<Recipe> {
        return this.recipes[type];
    }
}

export default Crafting;