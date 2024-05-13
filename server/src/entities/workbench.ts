import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { HealthComponentArray, TribeComponentArray } from "../components/ComponentArray";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../components/StatusEffectComponent";
import Tribe from "../Tribe";
import { TribeComponent } from "../components/TribeComponent";
import CircularHitbox from "../hitboxes/CircularHitbox";

export const HITBOX_SIZE = 80;

export function createWorbenchHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1.6, 0, 0, HitboxCollisionType.hard, localID, parentRotation, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createWorkbench(position: Point, rotation: number, tribe: Tribe): Entity {
   const workbench = new Entity(position, rotation, EntityType.workbench, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new RectangularHitbox(workbench.position.x, workbench.position.y, 1.6, 0, 0, HitboxCollisionType.hard, workbench.getNextHitboxLocalID(), workbench.rotation, HITBOX_SIZE, HITBOX_SIZE, 0);
   workbench.addHitbox(hitbox);

   const hitboxes = createWorbenchHitboxes(workbench.position.x, workbench.position.y, workbench.getNextHitboxLocalID(), workbench.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      workbench.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(workbench.id, new HealthComponent(15));
   StatusEffectComponentArray.addComponent(workbench.id, new StatusEffectComponent(0));
   TribeComponentArray.addComponent(workbench.id, new TribeComponent(tribe));

   return workbench;
}