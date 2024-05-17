import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponentArray, HutComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { HutComponent } from "../../components/HutComponent";
import { TribeComponent } from "../../components/TribeComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";

export const WARRIOR_HUT_SIZE = 104 - 0.05;

export function createWarriorHutHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   hitboxes.push(new RectangularHitbox(parentX, parentY, 2, 0, 0, HitboxCollisionType.soft, localID, parentRotation, WARRIOR_HUT_SIZE, WARRIOR_HUT_SIZE, 0));
   return hitboxes;
}

export function createWarriorHut(position: Point, rotation: number, tribe: Tribe): Entity {
   const hut = new Entity(position, rotation, EntityType.warriorHut, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createWarriorHutHitboxes(hut.position.x, hut.position.y, hut.getNextHitboxLocalID(), hut.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      hut.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(hut.id, new HealthComponent(75));
   StatusEffectComponentArray.addComponent(hut.id, new StatusEffectComponent(StatusEffect.poisoned));
   HutComponentArray.addComponent(hut.id, new HutComponent());
   TribeComponentArray.addComponent(hut.id, new TribeComponent(tribe));

   return hut;
}