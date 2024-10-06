import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { createFurnaceHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../../components";
import Tribe from "../../../Tribe";
import { CookingComponent } from "../../../components/CookingComponent";
import { HealthComponent } from "../../../components/HealthComponent";
import { InventoryComponent, addInventoryToInventoryComponent } from "../../../components/InventoryComponent";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent";
import { StructureComponent } from "../../../components/StructureComponent";
import { TransformComponent } from "../../../components/TransformComponent";
import { TribeComponent } from "../../../components/TribeComponent";
import { CollisionGroup } from "../../../../../shared/src/collision-groups";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.inventory
   | ServerComponentType.cooking;

export function createFurnaceConfig(tribe: Tribe, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   transformComponent.addHitboxes(createFurnaceHitboxes(), null);
   
   const healthComponent = new HealthComponent(25);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding);

   const structureComponent = new StructureComponent(connectionInfo);

   const tribeComponent = new TribeComponent(tribe);

   const inventoryComponent = new InventoryComponent();

   // @Copynpaste @Cleanup: don't add here, add in cooking component
   
   const fuelInventory = new Inventory(1, 1, InventoryName.fuelInventory);
   addInventoryToInventoryComponent(inventoryComponent, fuelInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   const ingredientInventory = new Inventory(1, 1, InventoryName.ingredientInventory);
   addInventoryToInventoryComponent(inventoryComponent, ingredientInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });

   const outputInventory = new Inventory(1, 1, InventoryName.outputInventory);
   addInventoryToInventoryComponent(inventoryComponent, outputInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   const cookingComponent = new CookingComponent(0);
   
   return {
      entityType: EntityType.furnace,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.cooking]: cookingComponent
      }
   };
}