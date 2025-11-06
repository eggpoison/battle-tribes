<script lang="ts">
   import { type Inventory, ItemType } from "webgl-test-shared";
   import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../../game/client-item-info";
   import { countItemTypesInInventory } from "../../../../game/inventory-manipulation";

   interface Props {
      readonly hotbar: Inventory;
      readonly ingredientType: ItemType;
      readonly amountRequiredForRecipe: number;
   }

   let props: Props = $props();

   let tooltipIsShown = $state(false);
   
   const itemIconSource = getItemTypeImage(props.ingredientType);

   // Find whether the player has enough available ingredients to craft the recipe
   const numIngredientsAvailableToPlayer = countItemTypesInInventory(props.hotbar, props.ingredientType);
   const playerHasEnoughIngredients = numIngredientsAvailableToPlayer >= props.amountRequiredForRecipe;

   const onmouseenter = () => {
      tooltipIsShown = true;
   }
   
   const onmouseleave = () => {
      tooltipIsShown = false;
   }
</script>

<li class="ingredient">
   <!-- svelte-ignore a11y_no_static_element_interactions -->
   <div class="ingredient-icon-wrapper" {onmouseenter} {onmouseleave}>
      <img src={itemIconSource} class="ingredient-icon" alt="" />

      {#if tooltipIsShown}
         <div class="ingredient-tooltip">
            <span>{CLIENT_ITEM_INFO_RECORD[props.ingredientType].name}</span>
         </div>
      {/if}
   </div>
   <span class={`ingredient-count${!playerHasEnoughIngredients ? " not-enough" : ""}`}>x{props.amountRequiredForRecipe}</span>
</li>