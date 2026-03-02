<script lang="ts">
   import { type CraftingRecipe, type Inventory } from "webgl-test-shared";
   import CraftingIngredient from "./CraftingIngredient.svelte";

   interface Props {
      readonly hotbar: Inventory;
      readonly recipe: CraftingRecipe;
   }

   let props: Props = $props();
</script>

<ul class="ingredients">
   {#each props.recipe.ingredients.getEntries() as entry}
      <CraftingIngredient hotbar={props.hotbar} ingredientType={entry.itemType} amountRequiredForRecipe={entry.count} />
   {/each}
</ul>