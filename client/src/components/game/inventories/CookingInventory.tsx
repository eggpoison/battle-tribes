import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { COOKING_INGREDIENT_ITEM_TYPES, CookingIngredientItemType, FUEL_SOURCE_ITEM_TYPES, FuelSourceItemType } from "webgl-test-shared/dist/cooking-info";
import { useCallback } from "react";
import { getItemTypeImage } from "../../../client-item-info";
import ItemSlot from "./ItemSlot";
import { leftClickItemSlot } from "../../../inventory-manipulation";
import { definiteGameState } from "../../../game-state/game-states";
import { getSelectedEntity } from "../../../entity-selection";
import { InventoryName } from "webgl-test-shared/dist/items";

const CookingInventory = () => {
   const cookingEntity = getSelectedEntity();
   const cookingComponent = cookingEntity.getServerComponent(ServerComponentType.cooking);
   const inventoryComponent = cookingEntity.getServerComponent(ServerComponentType.inventory);

   const fuelInventory = inventoryComponent.getInventory(InventoryName.fuelInventory);
   const ingredientInventory = inventoryComponent.getInventory(InventoryName.ingredientInventory);
   const outputInventory = inventoryComponent.getInventory(InventoryName.outputInventory);

   let fuelPicturedItemImageSrc: string | undefined = undefined;
   let fuelItemCount: number | undefined;

   const fuel = fuelInventory.itemSlots[1];
   if (typeof fuel !== "undefined") {
      fuelPicturedItemImageSrc = getItemTypeImage(fuel.type);
      fuelItemCount = fuel.count;
   }

   let ingredientPicturedItemImageSrc: string | undefined = undefined;
   let ingredientItemCount: number | undefined;

   const ingredient = ingredientInventory.itemSlots[1];
   if (typeof ingredient !== "undefined") {
      ingredientPicturedItemImageSrc = getItemTypeImage(ingredient.type);
      ingredientItemCount = ingredient.count;
   }

   let outputPicturedItemImageSrc: string | undefined = undefined;
   let outputItemCount: number | undefined;

   const output = outputInventory.itemSlots[1];
   if (typeof output !== "undefined") {
      outputPicturedItemImageSrc = getItemTypeImage(output.type);
      outputItemCount = output.count;
   }

   const clickIngredientItemSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      const heldItem = definiteGameState.heldItemSlot.itemSlots[1];
      if (typeof heldItem !== "undefined" && !COOKING_INGREDIENT_ITEM_TYPES.includes(heldItem.type as CookingIngredientItemType)) {
         return;
      }
      leftClickItemSlot(e, cookingEntity.id, ingredientInventory, 1);
   }, [cookingEntity.id, ingredientInventory]);

   const clickFuelItemSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      const heldItem = definiteGameState.heldItemSlot.itemSlots[1];
      if (typeof heldItem !== "undefined" && !FUEL_SOURCE_ITEM_TYPES.includes(heldItem.type as FuelSourceItemType)) {
         return;
      }
      leftClickItemSlot(e, cookingEntity.id, fuelInventory, 1);
   }, [cookingEntity, fuelInventory]);

   const clickOutputItemSlot = useCallback((e: MouseEvent): void => {
      // Don't let the player place items into the slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1)) {
         return;
      }
      leftClickItemSlot(e, cookingEntity.id, outputInventory, 1);
   }, [cookingEntity, outputInventory]);

   const heatingBarProgress = cookingComponent.heatingProgress !== -1 ? cookingComponent.heatingProgress : 0;

   return <div id="cooking-inventory" className={`heating-inventory inventory${cookingEntity.type !== EntityType.campfire ? " with-fuel" : ""}`}>
      <ItemSlot onClick={clickIngredientItemSlot} className="ingredient-inventory" isSelected={false} picturedItemImageSrc={ingredientPicturedItemImageSrc} itemCount={ingredientItemCount} />
      {cookingEntity.type !== EntityType.campfire ? (
         <ItemSlot onClick={clickFuelItemSlot} className="fuel-inventory" isSelected={false} picturedItemImageSrc={fuelPicturedItemImageSrc} itemCount={fuelItemCount} />
      ) : undefined}
      <ItemSlot onClick={clickOutputItemSlot} className="output-inventory" isSelected={false} picturedItemImageSrc={outputPicturedItemImageSrc} itemCount={outputItemCount} />

      <div className="heating-progress-bar">
         {/* @Cleanup: Hardcoded */}
         <div className="heating-progress-bar-heat" style={{width: heatingBarProgress * 4.5 * 20 + "px"}}></div>
      </div>
   </div>;
}

export default CookingInventory;