import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { InventoryComponent, InventoryComponentArray, createNewInventory } from "../../components/InventoryComponent";
import Tribe from "../../Tribe";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { InventoryName } from "webgl-test-shared/dist/items";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";

const HITBOX_SIZE = 80 - 0.05;

export function createBarrelHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(parentPosition, 1.5, 0, 0, HitboxCollisionType.hard, HITBOX_SIZE / 2, localID, parentRotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createBarrel(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const barrel = new Entity(position, rotation, EntityType.barrel, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createBarrelHitboxes(position, barrel.getNextHitboxLocalID(), barrel.rotation);
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