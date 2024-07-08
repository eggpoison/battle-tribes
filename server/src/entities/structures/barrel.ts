import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { InventoryComponent, InventoryComponentArray, createNewInventory } from "../../components/InventoryComponent";
import Tribe from "../../Tribe";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createBarrelHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { InventoryName } from "webgl-test-shared/dist/items/items";

export function createBarrel(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const barrel = new Entity(position, rotation, EntityType.barrel, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createBarrelHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      barrel.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(barrel.id, new HealthComponent(20));
   StatusEffectComponentArray.addComponent(barrel.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(barrel.id, new TribeComponent(tribe));
   StructureComponentArray.addComponent(barrel.id, new StructureComponent(connectionInfo));

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(barrel.id, inventoryComponent);
   createNewInventory(inventoryComponent, InventoryName.inventory, 3, 3, { acceptsPickedUpItems: false, isDroppedOnDeath: true });

   return barrel;
}