import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../../Entity";
import { CookingComponent, CookingComponentArray } from "../../../components/CookingComponent";
import { HealthComponent, HealthComponentArray } from "../../../components/HealthComponent";
import { InventoryComponent, InventoryComponentArray, createNewInventory } from "../../../components/InventoryComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../../components/StatusEffectComponent";
import { tickCookingEntity } from "./cooking-entity";
import Tribe from "../../../Tribe";
import { TribeComponent, TribeComponentArray } from "../../../components/TribeComponent";
import { StructureComponent, StructureComponentArray } from "../../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createFurnaceHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { InventoryName } from "webgl-test-shared/dist/items/items";

export function createFurnace(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const furnace = new Entity(position, rotation, EntityType.furnace, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createFurnaceHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      furnace.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(furnace.id, new HealthComponent(25));
   StatusEffectComponentArray.addComponent(furnace.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(furnace.id, new TribeComponent(tribe));
   StructureComponentArray.addComponent(furnace.id, new StructureComponent(connectionInfo));

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(furnace.id, inventoryComponent);
   createNewInventory(inventoryComponent, InventoryName.fuelInventory, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   createNewInventory(inventoryComponent, InventoryName.ingredientInventory, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   createNewInventory(inventoryComponent, InventoryName.outputInventory, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });

   CookingComponentArray.addComponent(furnace.id, new CookingComponent());

   return furnace;
}

export function tickFurnace(furnace: Entity): void {
   tickCookingEntity(furnace);
}