import { EntityType } from "battletribes-shared/entities";
import { COOKING_INGREDIENT_ITEM_TYPES, FUEL_SOURCE_ITEM_TYPES } from "battletribes-shared/items/cooking-info";
import ItemSlot from "./ItemSlot";
import { getSelectedEntity } from "../../../entity-selection";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import { getEntityType } from "../../../world";
import { CookingComponentArray } from "../../../entity-components/server-components/CookingComponent";
import { InventoryComponentArray } from "../../../entity-components/server-components/InventoryComponent";

const CookingInventory = () => {
   const cookingEntity = getSelectedEntity();
   const cookingComponent = CookingComponentArray.getComponent(cookingEntity);
   const inventoryComponent = InventoryComponentArray.getComponent(cookingEntity);

   const fuelInventory = inventoryComponent.getInventory(InventoryName.fuelInventory)!;
   const ingredientInventory = inventoryComponent.getInventory(InventoryName.ingredientInventory)!;
   const outputInventory = inventoryComponent.getInventory(InventoryName.outputInventory)!;

   const heatingBarProgress = cookingComponent.heatingProgress !== -1 ? cookingComponent.heatingProgress : 0;

   const entityType = getEntityType(cookingEntity);
   return <div id="cooking-inventory" className={`heating-inventory inventory${entityType !== EntityType.campfire ? " with-fuel" : ""}`}>
      <ItemSlot validItemSpecifier={(COOKING_INGREDIENT_ITEM_TYPES as unknown as Array<ItemType>).includes} className="ingredient-inventory" entityID={cookingEntity} inventory={ingredientInventory} itemSlot={1} />
      {entityType !== EntityType.campfire ? (
         <ItemSlot validItemSpecifier={(FUEL_SOURCE_ITEM_TYPES as unknown as Array<ItemType>).includes} className="fuel-inventory" entityID={cookingEntity} inventory={fuelInventory} itemSlot={1} />
      ) : undefined}
      <ItemSlot validItemSpecifier={() => false} className="output-inventory" entityID={cookingEntity} inventory={outputInventory} itemSlot={1} />

      <div className="heating-progress-bar">
         {/* @Cleanup: Hardcoded */}
         <div className="heating-progress-bar-heat" style={{width: heatingBarProgress * 4.5 * 20 + "px"}}></div>
      </div>
   </div>;
}

export default CookingInventory;