import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { HealthComponentArray, CookingComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { CookingComponent } from "../../components/CookingComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { InventoryComponent, InventoryComponentArray, createNewInventory } from "../../components/InventoryComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { tickCookingEntity } from "./cooking-entity";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { InventoryName } from "webgl-test-shared/dist/items";

const HITBOX_SIZE = 80;

export function createFurnaceHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<RectangularHitbox | CircularHitbox> {
   const hitboxes = new Array<RectangularHitbox | CircularHitbox>();
   hitboxes.push(new RectangularHitbox(parentPosition, 2, 0, 0, HitboxCollisionType.hard, localID, parentRotation, HITBOX_SIZE, HITBOX_SIZE, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createFurnace(position: Point, rotation: number, tribe: Tribe): Entity {
   const furnace = new Entity(position, rotation, EntityType.furnace, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createFurnaceHitboxes(position, furnace.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      furnace.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(furnace.id, new HealthComponent(25));
   StatusEffectComponentArray.addComponent(furnace.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(furnace.id, new TribeComponent(tribe));

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