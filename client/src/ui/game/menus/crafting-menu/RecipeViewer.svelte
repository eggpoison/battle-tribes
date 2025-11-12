<script lang="ts">
   import { type CraftingRecipe } from "webgl-test-shared";
   import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../../game/client-item-info";

   interface Props {
      readonly recipe: CraftingRecipe;
      readonly offsetY: number;
   }

   let props: Props = $props();
</script>

<div class="recipe-viewer" style:--offset-y="{props.offsetY}px">
   <div class="header">
      <img class="recipe-product-icon" src={getItemTypeImage(props.recipe.product)} alt="" />
      <div class="recipe-product-name">{CLIENT_ITEM_INFO_RECORD[props.recipe.product].name}</div>
   </div>

   <ul class="ingredients">
      {#each props.recipe.ingredients.getEntries() as entry}
         <li class="ingredient">
            <img class="ingredient-icon" src={getItemTypeImage(entry.itemType)} alt="" />
            <span class="ingredient-count">x{entry.count}</span>
         </li>;
      {/each}
   </ul>

   <div class="splitter"></div>

   <div class="caption">Click to open</div>
</div>