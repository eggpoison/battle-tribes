import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { CookingComponentArray, HealthComponentArray, InventoryComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { InventoryComponent, createNewInventory } from "../../components/InventoryComponent";
import { tickCookingEntity } from "./cooking-entity";
import { CookingComponent } from "../../components/CookingComponent";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { InventoryName } from "webgl-test-shared/dist/items";

export const CAMPFIRE_SIZE = 104;

const LIFETIME_SECONDS = 30;

export function createCampfireHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<RectangularHitbox | CircularHitbox> {
   const hitboxes = new Array<RectangularHitbox | CircularHitbox>();
   hitboxes.push(new CircularHitbox(parentPosition, 2, 0, 0, HitboxCollisionType.soft, CAMPFIRE_SIZE / 2, localID, parentRotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createCampfire(position: Point, rotation: number, tribe: Tribe): Entity {
   const campfire = new Entity(position, rotation, EntityType.campfire, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createCampfireHitboxes(position, campfire.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      campfire.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(campfire.id, new HealthComponent(25));
   StatusEffectComponentArray.addComponent(campfire.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(campfire.id, new TribeComponent(tribe));

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(campfire.id, inventoryComponent);
   createNewInventory(inventoryComponent, InventoryName.fuelInventory, 1, 1, false);
   createNewInventory(inventoryComponent, InventoryName.ingredientInventory, 1, 1, false);
   createNewInventory(inventoryComponent, InventoryName.outputInventory, 1, 1, false);

   const cookingEntityComponent = new CookingComponent();
   cookingEntityComponent.remainingHeatSeconds = LIFETIME_SECONDS;
   CookingComponentArray.addComponent(campfire.id, cookingEntityComponent);

   return campfire;
}

export function tickCampfire(campfire: Entity): void {
   // @Incomplete: Destroy campfire when remaining heat reaches 0
   tickCookingEntity(campfire);
}