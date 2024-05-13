import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { FenceComponentArray, HealthComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent } from "../../components/TribeComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { FenceComponent } from "../../components/FenceComponent";
import { ConnectedEntityIDs } from "../tribes/tribe-member";
import { FenceConnectionComponent, FenceConnectionComponentArray, removeFenceConnection } from "../../components/FenceConnectionComponent";

const NODE_HITBOX_WIDTH = 20 - 0.05;
const NODE_HITBOX_HEIGHT = 20 - 0.05;

export function createFenceHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<RectangularHitbox | CircularHitbox> {
   const hitboxes = new Array<RectangularHitbox | CircularHitbox>();
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1, 0, 0, HitboxCollisionType.hard, localID, parentRotation, NODE_HITBOX_WIDTH, NODE_HITBOX_HEIGHT, 0));
   return hitboxes;
}

export function createFence(position: Point, rotation: number, tribe: Tribe, connectedSidesBitset: number, connectedEntityIDs: ConnectedEntityIDs): Entity {
   const fence = new Entity(position, rotation, EntityType.fence, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createFenceHitboxes(position.x, position.y, fence.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      fence.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(fence.id, new HealthComponent(5));
   StatusEffectComponentArray.addComponent(fence.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(fence.id, new TribeComponent(tribe));
   FenceConnectionComponentArray.addComponent(fence.id, new FenceConnectionComponent(connectedSidesBitset, connectedEntityIDs));
   FenceComponentArray.addComponent(fence.id, new FenceComponent());
   
   return fence;
}

const removeConnection = (fenceID: number, removedEntityID: number): void => {
   const fenceConnectionComponent = FenceConnectionComponentArray.getComponent(fenceID);
   
   for (let i = 0; i < 4; i++) {
      const entityID = fenceConnectionComponent.connectedEntityIDs[i];
      if (entityID === removedEntityID) {
         removeFenceConnection(fenceConnectionComponent, i);
         break;
      }
   }
}

export function onFenceRemove(fence: Entity): void {
   const fenceConnectionComponent = FenceConnectionComponentArray.getComponent(fence.id);
   for (let i = 0; i < 4; i++) {
      const entityID = fenceConnectionComponent.connectedEntityIDs[i];
      if (FenceConnectionComponentArray.hasComponent(entityID)) {
         removeConnection(entityID, fence.id);
      }
   }
}