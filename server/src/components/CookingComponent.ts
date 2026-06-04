import { ServerComponentType } from "../../../shared/dist/components.js";
import { EntityType, Entity } from "../../../shared/dist/entities.js";
import { ItemType, InventoryName, ItemTypeString } from "../../../shared/dist/items/items.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { CookingIngredientItemType, FuelSourceItemType } from "../../../shared/dist/items/cooking-info.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { InventoryComponentArray, getInventory, consumeItemTypeFromInventory, addItemToInventory } from "./InventoryComponent.js";
import { getEntityType } from "../world.js";
import { registerDirtyEntity } from "../server/player-clients.js";
import { createItem } from "../items.js";

export interface HeatingRecipe {
   readonly ingredientType: CookingIngredientItemType;
   readonly ingredientAmount: number;
   readonly productType: ItemType;
   readonly productAmount: number;
   readonly cookTime: number;
   /** Which heating entities are able to use the recipe */
   readonly usableHeatingEntityTypes: ReadonlyArray<EntityType>;
}

const HEATING_INFO: ReadonlyArray<HeatingRecipe> = [
   {
      ingredientType: ItemType.raw_beef,
      ingredientAmount: 1,
      productType: ItemType.cooked_beef,
      productAmount: 1,
      cookTime: 5,
      usableHeatingEntityTypes: [EntityType.campfire, EntityType.furnace]
   },
   {
      ingredientType: ItemType.meat_suit,
      ingredientAmount: 1,
      productType: ItemType.cooked_beef,
      productAmount: 5,
      cookTime: 5,
      usableHeatingEntityTypes: [EntityType.campfire, EntityType.furnace]
   },
   {
      ingredientType: ItemType.raw_fish,
      ingredientAmount: 1,
      productType: ItemType.cooked_fish,
      productAmount: 1,
      cookTime: 5,
      usableHeatingEntityTypes: [EntityType.campfire, EntityType.furnace]
   },
   {
      ingredientType: ItemType.mithrilOre,
      ingredientAmount: 3,
      productType: ItemType.mithrilBar,
      productAmount: 1,
      cookTime: 5,
      usableHeatingEntityTypes: [EntityType.furnace],
   }
];

/** The seconds of heating given by different item types */
const FUEL_SOURCES: Record<FuelSourceItemType, number> = {
   [ItemType.wood]: 5
};

export class CookingComponent {
   public heatingTimer = 0;
   public currentRecipe: HeatingRecipe | null = null;

   public remainingHeatSeconds = 0;

   constructor(remainingHeatSeconds: number) {
      this.remainingHeatSeconds = remainingHeatSeconds;
   }
}

export const CookingComponentArray = new ComponentArray<CookingComponent>(ServerComponentType.cooking, true, getDataLength, addDataToPacket);
CookingComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const getHeatingRecipeByIngredientType = (heatingEntityType: EntityType, ingredientType: ItemType): HeatingRecipe | null => {
   for (const heatingInfo of HEATING_INFO) {
      if (heatingInfo.ingredientType === ingredientType) {
         // Found it!

         // If the heating entity type can't use that recipe, don't let it craft it
         if (!heatingInfo.usableHeatingEntityTypes.includes(heatingEntityType)) {
            return null;
         }

         return heatingInfo;
      }
   }

   console.warn(`Couldn't find a heating recipe for '${ingredientType}'.`);
   return null;
}

function onTick(entity: Entity): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const cookingComponent = CookingComponentArray.getComponent(entity);

   const fuelInventory = getInventory(inventoryComponent, InventoryName.fuelInventory);
   const ingredientInventory = getInventory(inventoryComponent, InventoryName.ingredientInventory);
   
   const ingredient = ingredientInventory.itemSlots[1];
   if (ingredient !== undefined) {
      cookingComponent.currentRecipe = getHeatingRecipeByIngredientType(getEntityType(entity), ingredient.type);
   }
   
   if (cookingComponent.remainingHeatSeconds > 0) {
      registerDirtyEntity(entity);
   }
   cookingComponent.remainingHeatSeconds -= Settings.DT_S;
   if (cookingComponent.remainingHeatSeconds < 0) {
      cookingComponent.remainingHeatSeconds = 0;
   }
   
   if (cookingComponent.currentRecipe !== null) {
      // If the heating entity needs more heat, attempt to use a fuel item
      if (cookingComponent.remainingHeatSeconds <= 0) {
         const fuel = fuelInventory.itemSlots[1];
         if (fuel !== undefined) {
            if (!FUEL_SOURCES.hasOwnProperty(fuel.type)) {
               console.warn(`Item type '${ItemTypeString[fuel.type]}' is not a valid fuel type.`);
               return;
            }
   
            cookingComponent.remainingHeatSeconds += FUEL_SOURCES[fuel.type as keyof typeof FUEL_SOURCES];
            registerDirtyEntity(entity);
            consumeItemTypeFromInventory(entity, inventoryComponent, InventoryName.fuelInventory, fuel.type, 1);
         }
      }

      if (cookingComponent.remainingHeatSeconds > 0) {
         cookingComponent.heatingTimer += Settings.DT_S;
         registerDirtyEntity(entity);
         
         if (cookingComponent.heatingTimer >= cookingComponent.currentRecipe.cookTime) {
            // Remove from ingredient inventory and add to output inventory

            consumeItemTypeFromInventory(entity, inventoryComponent, InventoryName.ingredientInventory, cookingComponent.currentRecipe.ingredientType, cookingComponent.currentRecipe.ingredientAmount);

            const outputInventory = getInventory(inventoryComponent, InventoryName.outputInventory);
            addItemToInventory(entity, outputInventory, createItem(cookingComponent.currentRecipe.productType, cookingComponent.currentRecipe.productAmount, "", ""));

            cookingComponent.heatingTimer = 0;
            cookingComponent.currentRecipe = null;
         }
      }
   }
}

function getDataLength(): number {
   return 2 * Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);

   // Heating progress
   packet.writeNumber(cookingComponent.currentRecipe !== null ? cookingComponent.heatingTimer / cookingComponent.currentRecipe.cookTime : -1);
   // Is cooking
   packet.writeBool(cookingComponent.remainingHeatSeconds > 0);
}