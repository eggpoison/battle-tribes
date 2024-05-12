import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { FenceGateComponentArray, HealthComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent } from "../../components/TribeComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { FenceGateComponent } from "../../components/FenceGateComponent";
import { FenceConnectionComponent, FenceConnectionComponentArray } from "../../components/FenceConnectionComponent";
import { ConnectedEntityIDs } from "../tribes/tribe-member";

const HITBOX_WIDTH = 56 - 0.05;
const HITBOX_HEIGHT = 16 - 0.05;

export function createFenceGateHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<RectangularHitbox | CircularHitbox> {
   const hitboxes = new Array<RectangularHitbox | CircularHitbox>();
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1, 0, 0, HitboxCollisionType.hard, localID, parentRotation, HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   return hitboxes;
}

export function createFenceGate(position: Point, rotation: number, tribe: Tribe, connectedSidesBitset: number, connectedEntityIDs: ConnectedEntityIDs): Entity {
   const fenceGate = new Entity(position, EntityType.fenceGate, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   fenceGate.rotation = rotation;

   const hitboxes = createFenceGateHitboxes(position.x, position.y, fenceGate.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      fenceGate.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(fenceGate.id, new HealthComponent(5));
   StatusEffectComponentArray.addComponent(fenceGate.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(fenceGate.id, new TribeComponent(tribe));
   FenceConnectionComponentArray.addComponent(fenceGate.id, new FenceConnectionComponent(connectedSidesBitset, connectedEntityIDs));
   FenceGateComponentArray.addComponent(fenceGate.id, new FenceGateComponent());
   
   return fenceGate;
}