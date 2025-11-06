<script lang="ts">
   import { InventoryName, ItemType, COOKING_INGREDIENT_ITEM_TYPES, FUEL_SOURCE_ITEM_TYPES, EntityType } from "webgl-test-shared";
   import ItemSlot from "./ItemSlot.svelte";
   import { getEntityType } from "../../../game/world";
   import { CookingComponentArray } from "../../../game/entity-components/server-components/CookingComponent";
   import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import MenuElem from "../menus/MenuElem.svelte";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";

   // @Hack: "!"
   const cookingEntity = entityInteractionState.selectedEntity!;
   const cookingComponent = CookingComponentArray.getComponent(cookingEntity);
   const inventoryComponent = InventoryComponentArray.getComponent(cookingEntity);
   
   const fuelInventory = getInventory(inventoryComponent, InventoryName.fuelInventory)!;
   const ingredientInventory = getInventory(inventoryComponent, InventoryName.ingredientInventory)!;
   const outputInventory = getInventory(inventoryComponent, InventoryName.outputInventory)!;

   const heatingBarProgress = cookingComponent.heatingProgress !== -1 ? cookingComponent.heatingProgress : 0;

   const entityType = getEntityType(cookingEntity);
</script>

<MenuElem id="cooking-inventory" className={`heating-inventory inventory${entityType !== EntityType.campfire ? " with-fuel" : ""}`}>
   <ItemSlot validItemSpecifier={(COOKING_INGREDIENT_ITEM_TYPES as unknown as Array<ItemType>).includes} className="ingredient-inventory" entityID={cookingEntity} inventory={ingredientInventory} itemSlot={1} />
   {#if entityType !== EntityType.campfire}
      <ItemSlot validItemSpecifier={(FUEL_SOURCE_ITEM_TYPES as unknown as Array<ItemType>).includes} className="fuel-inventory" entityID={cookingEntity} inventory={fuelInventory} itemSlot={1} />
   {/if}
   <ItemSlot validItemSpecifier={() => false} className="output-inventory" entityID={cookingEntity} inventory={outputInventory} itemSlot={1} />

   <div class="heating-progress-bar">
      <!-- @Cleanup: Hardcoded -->
      <div class="heating-progress-bar-heat" style:width="{heatingBarProgress * 4.5 * 20}px"></div>
   </div>
</MenuElem>