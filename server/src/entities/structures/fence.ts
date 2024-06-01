import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { FenceComponent, FenceComponentArray } from "../../components/FenceComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";

const NODE_HITBOX_WIDTH = 20 - 0.05;
const NODE_HITBOX_HEIGHT = 20 - 0.05;

export function createFenceHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(parentPosition, 1, 0, 0, HitboxCollisionType.hard, localID, parentRotation, NODE_HITBOX_WIDTH, NODE_HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createFence(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const fence = new Entity(position, rotation, EntityType.fence, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createFenceHitboxes(position, fence.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      fence.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(fence.id, new HealthComponent(5));
   StatusEffectComponentArray.addComponent(fence.id, new StatusEffectComponent(StatusEffect.poisoned));
   StructureComponentArray.addComponent(fence.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(fence.id, new TribeComponent(tribe));
   FenceComponentArray.addComponent(fence.id, new FenceComponent());
   
   return fence;
}