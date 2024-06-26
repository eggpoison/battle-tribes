import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { wasTribeMemberKill } from "../tribes/tribe-member";
import { BoulderComponent, BoulderComponentArray } from "../../components/BoulderComponent";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";

const RADIUS = 40;

export function createBoulder(position: Point, rotation: number): Entity {
   const boulder = new Entity(position, rotation, EntityType.boulder, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(1.25, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, RADIUS);
   boulder.addHitbox(hitbox);

   HealthComponentArray.addComponent(boulder.id, new HealthComponent(40));
   StatusEffectComponentArray.addComponent(boulder.id, new StatusEffectComponent(StatusEffect.poisoned));
   BoulderComponentArray.addComponent(boulder.id, new BoulderComponent());
   
   return boulder;
}

export function onBoulderDeath(boulder: Entity, attackingEntity: Entity): void {
   if (wasTribeMemberKill(attackingEntity)) {
      createItemsOverEntity(boulder, ItemType.rock, randInt(5, 7), 40);
   }
}