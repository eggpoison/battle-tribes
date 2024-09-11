import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { COOKING_INGREDIENT_ITEM_TYPES, FUEL_SOURCE_ITEM_TYPES } from "battletribes-shared/items/cooking-info";
import ItemSlot from "./ItemSlot";
import { getSelectedEntity } from "../../../entity-selection";
import { InventoryName } from "battletribes-shared/items/items";

const CookingInventory = () => {
   const cookingEntity = getSelectedEntity();
   const cookingComponent = cookingEntity.getServerComponent(ServerComponentType.cooking);
   const inventoryComponent = cookingEntity.getServerComponent(ServerComponentType.inventory);

   const fuelInventory = inventoryComponent.getInventory(InventoryName.fuelInventory)!;
   const ingredientInventory = inventoryComponent.getInventory(InventoryName.ingredientInventory)!;
   const outputInventory = inventoryComponent.getInventory(InventoryName.outputInventory)!;

   const heatingBarProgress = cookingComponent.heatingProgress !== -1 ? cookingComponent.heatingProgress : 0;

   return <div id="cooking-inventory" className={`heating-inventory inventory${cookingEntity.type !== EntityType.campfire ? " with-fuel" : ""}`}>
      <ItemSlot validItemSpecifier={COOKING_INGREDIENT_ITEM_TYPES.includes} className="ingredient-inventory" entityID={cookingEntity.id} inventory={ingredientInventory} itemSlot={1} />
      {cookingEntity.type !== EntityType.campfire ? (
         <ItemSlot validItemSpecifier={FUEL_SOURCE_ITEM_TYPES.includes} className="fuel-inventory" entityID={cookingEntity.id} inventory={fuelInventory} itemSlot={1} />
      ) : undefined}
      <ItemSlot validItemSpecifier={() => false} className="output-inventory" entityID={cookingEntity.id} inventory={outputInventory} itemSlot={1} />

      <div className="heating-progress-bar">
         {/* @Cleanup: Hardcoded */}
         <div className="heating-progress-bar-heat" style={{width: heatingBarProgress * 4.5 * 20 + "px"}}></div>
      </div>
   </div>;
}

export default CookingInventory;