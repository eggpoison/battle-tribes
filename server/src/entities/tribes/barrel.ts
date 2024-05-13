import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { HealthComponentArray, InventoryComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { InventoryComponent, createNewInventory } from "../../components/InventoryComponent";
import Tribe from "../../Tribe";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent } from "../../components/TribeComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { InventoryName } from "webgl-test-shared/dist/items";

const HITBOX_SIZE = 80 - 0.05;

export function createBarrelHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   hitboxes.push(new CircularHitbox(parentX, parentY, 1.5, 0, 0, HitboxCollisionType.hard, HITBOX_SIZE / 2, localID, parentRotation));
   return hitboxes;
}

export function createBarrel(position: Point, rotation: number, tribe: Tribe): Entity {
   const barrel = new Entity(position, rotation, EntityType.barrel, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createBarrelHitboxes(barrel.position.x, barrel.position.y, barrel.getNextHitboxLocalID(), barrel.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      barrel.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(barrel.id, new HealthComponent(20));
   StatusEffectComponentArray.addComponent(barrel.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(barrel.id, new TribeComponent(tribe));

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(barrel.id, inventoryComponent);
   createNewInventory(inventoryComponent, InventoryName.inventory, 3, 3, false);

   return barrel;
}