import { EntityConfig } from "../../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../../components/TransformComponent.js";
import { HealthComponent } from "../../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../../components/StructureComponent.js";
import Tribe from "../../../Tribe.js";
import { TribeComponent } from "../../../components/TribeComponent.js";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../../components/InventoryComponent.js";
import { CookingComponent } from "../../../components/CookingComponent.js";
import { CampfireComponent } from "../../../components/CampfireComponent.js";
import { VirtualStructure } from "../../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { createHitbox, setHitboxIsNonGrassBlocking, setHitboxIsStatic } from "../../../hitboxes.js";
import { StructureConnection } from "../../../structure-placement.js";
import { createCircularBox, HitboxCollisionType } from "../../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../../shared/dist/collision.js";
import { EntityType } from "../../../../../shared/dist/entities.js";
import { Inventory, InventoryName } from "../../../../../shared/dist/items/items.js";
import { StatusEffect } from "../../../../../shared/dist/status-effects.js";

// @Incomplete: Destroy campfire when remaining heat reaches 0

export function createCampfireConfig(x: number, y: number, angle: number, tribe: Tribe, connections: StructureConnection[], virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = createCircularBox(x, y, 0, 0, angle, 52);
   const hitbox = createHitbox(transformComponent, null, box, 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   setHitboxIsNonGrassBlocking(hitbox);
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
   
   const cookingComponent = new CookingComponent(30);

   const campfireComponent = new CampfireComponent();
   
   return {
      entityType: EntityType.campfire,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         inventoryComponent,
         cookingComponent,
         campfireComponent
      ],
      lights: []
   };
}