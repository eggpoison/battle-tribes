import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
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

const HITBOX_SIZE = 88;

export function createWorkerHutHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1.8, 0, 0, HitboxCollisionType.soft, localID, parentRotation, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createWorkerHut(position: Point, rotation: number, tribe: Tribe): Entity {
   const hut = new Entity(position, EntityType.workerHut, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   hut.rotation = rotation;

   const hitboxes = createWorkerHutHitboxes(hut.position.x, hut.position.y, hut.getNextHitboxLocalID(), hut.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      hut.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(hut.id, new HealthComponent(50));
   StatusEffectComponentArray.addComponent(hut.id, new StatusEffectComponent(StatusEffect.poisoned));
   HutComponentArray.addComponent(hut.id, new HutComponent());
   TribeComponentArray.addComponent(hut.id, new TribeComponent(tribe));

   return hut;
}