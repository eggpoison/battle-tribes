import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { HutComponent, HutComponentArray } from "../../components/HutComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox, RectangularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

const HITBOX_SIZE = 88;

export function createWorkerHutHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.8, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createWorkerHut(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const hut = new Entity(position, rotation, EntityType.workerHut, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createWorkerHutHitboxes(hut.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      hut.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(hut.id, new HealthComponent(50));
   StatusEffectComponentArray.addComponent(hut.id, new StatusEffectComponent(StatusEffect.poisoned));
   StructureComponentArray.addComponent(hut.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(hut.id, new TribeComponent(tribe));
   HutComponentArray.addComponent(hut.id, new HutComponent());

   return hut;
}