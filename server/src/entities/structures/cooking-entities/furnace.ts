import { EntityType, StatusEffect, Inventory, InventoryName, HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, createRectangularBox } from "battletribes-shared";
import { EntityConfig } from "../../../components.js";
import Tribe from "../../../Tribe.js";
import { CookingComponent } from "../../../components/CookingComponent.js";
import { HealthComponent } from "../../../components/HealthComponent.js";
import { InventoryComponent, addInventoryToInventoryComponent } from "../../../components/InventoryComponent.js";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../../components/TransformComponent.js";
import { TribeComponent } from "../../../components/TribeComponent.js";
import { FurnaceComponent } from "../../../components/FurnaceComponent.js";
import { VirtualStructure } from "../../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { createHitbox, setHitboxIsStatic } from "../../../hitboxes.js";
import { StructureConnection } from "../../../structure-placement.js";

export function createFurnaceConfig(x: number, y: number, angle: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = createRectangularBox(x, y, 0, 0, angle, 80, 80);
   const hitbox = createHitbox(transformComponent, null, box, 2, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(25);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding);

   const structureComponent = new StructureComponent(connections, virtualStructure);

   const tribeComponent = new TribeComponent(tribe);

   const inventoryComponent = new InventoryComponent();

   // @Copynpaste @Cleanup: don't add here, add in cooking component
   
   const fuelInventory = new Inventory(1, 1, InventoryName.fuelInventory);
   addInventoryToInventoryComponent(inventoryComponent, fuelInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   
   const ingredientInventory = new Inventory(1, 1, InventoryName.ingredientInventory);
   addInventoryToInventoryComponent(inventoryComponent, ingredientInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true });

   const outputInventory = new Inventory(1, 1, InventoryName.outputInventory);
   addInventoryToInventoryComponent(inventoryComponent, outputInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   
   const cookingComponent = new CookingComponent(0);

   const furnaceComponent = new FurnaceComponent();
   
   return {
      entityType: EntityType.furnace,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         inventoryComponent,
         cookingComponent,
         furnaceComponent
      ],
      lights: []
   };
}