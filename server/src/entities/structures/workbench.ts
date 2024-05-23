import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { HealthComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";

export const HITBOX_SIZE = 80;

export function createWorbenchHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(parentPosition, 1.6, 0, 0, HitboxCollisionType.hard, localID, parentRotation, HITBOX_SIZE, HITBOX_SIZE, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createWorkbench(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const workbench = new Entity(position, rotation, EntityType.workbench, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createWorbenchHitboxes(position, workbench.getNextHitboxLocalID(), workbench.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      workbench.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(workbench.id, new HealthComponent(15));
   StatusEffectComponentArray.addComponent(workbench.id, new StatusEffectComponent(0));
   StructureComponentArray.addComponent(workbench.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(workbench.id, new TribeComponent(tribe));

   return workbench;
}