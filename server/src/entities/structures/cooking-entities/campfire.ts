import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../../Entity";
import { HealthComponent, HealthComponentArray } from "../../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../../components/StatusEffectComponent";
import { InventoryComponent, InventoryComponentArray, createNewInventory } from "../../../components/InventoryComponent";
import { tickCookingEntity } from "./cooking-entity";
import { CookingComponent, CookingComponentArray } from "../../../components/CookingComponent";
import Tribe from "../../../Tribe";
import { TribeComponent, TribeComponentArray } from "../../../components/TribeComponent";
import { InventoryName } from "webgl-test-shared/dist/items";
import { StructureComponent, StructureComponentArray } from "../../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createCampfireHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

const LIFETIME_SECONDS = 30;

export function createCampfire(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const campfire = new Entity(position, rotation, EntityType.campfire, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createCampfireHitboxes(campfire.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      campfire.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(campfire.id, new HealthComponent(25));
   StatusEffectComponentArray.addComponent(campfire.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(campfire.id, new TribeComponent(tribe));
   StructureComponentArray.addComponent(campfire.id, new StructureComponent(connectionInfo));

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(campfire.id, inventoryComponent);
   createNewInventory(inventoryComponent, InventoryName.fuelInventory, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   createNewInventory(inventoryComponent, InventoryName.ingredientInventory, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   createNewInventory(inventoryComponent, InventoryName.outputInventory, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });

   const cookingEntityComponent = new CookingComponent();
   cookingEntityComponent.remainingHeatSeconds = LIFETIME_SECONDS;
   CookingComponentArray.addComponent(campfire.id, cookingEntityComponent);

   return campfire;
}

export function tickCampfire(campfire: Entity): void {
   // @Incomplete: Destroy campfire when remaining heat reaches 0
   tickCookingEntity(campfire);
}