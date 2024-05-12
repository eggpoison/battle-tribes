import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { HealthComponentArray, InventoryComponentArray, CookingComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { CookingComponent } from "../../components/CookingComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { InventoryComponent, createNewInventory } from "../../components/InventoryComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { tickCookingEntity } from "./cooking-entity";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";

export const FURNACE_SIZE = 80;

export function createFurnaceHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<RectangularHitbox | CircularHitbox> {
   const hitboxes = new Array<RectangularHitbox | CircularHitbox>();
   hitboxes.push(new RectangularHitbox(parentX, parentY, 2, 0, 0, HitboxCollisionType.hard, localID, parentRotation, FURNACE_SIZE, FURNACE_SIZE, 0));
   return hitboxes;
}

export function createFurnace(position: Point, rotation: number, tribe: Tribe): Entity {
   const furnace = new Entity(position, EntityType.furnace, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   furnace.rotation = rotation;

   const hitboxes = createFurnaceHitboxes(position.x, position.y, furnace.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      furnace.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(furnace.id, new HealthComponent(25));
   StatusEffectComponentArray.addComponent(furnace.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(furnace.id, new TribeComponent(tribe));

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(furnace.id, inventoryComponent);
   createNewInventory(inventoryComponent, "fuelInventory", 1, 1, false);
   createNewInventory(inventoryComponent, "ingredientInventory", 1, 1, false);
   createNewInventory(inventoryComponent, "outputInventory", 1, 1, false);

   CookingComponentArray.addComponent(furnace.id, new CookingComponent());

   return furnace;
}

export function tickFurnace(furnace: Entity): void {
   tickCookingEntity(furnace);
}