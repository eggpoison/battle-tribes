import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { FenceGateComponent, FenceGateComponentArray } from "../../components/FenceGateComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox, RectangularHitbox, HitboxCollisionType, HitboxFlags } from "webgl-test-shared/dist/hitboxes/hitboxes";

const HITBOX_WIDTH = 56 - 0.05;
const HITBOX_HEIGHT = 16 - 0.05;

export function createFenceGateHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();

   const hitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, HitboxFlags.NON_GRASS_BLOCKING, HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createFenceGate(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const fenceGate = new Entity(position, rotation, EntityType.fenceGate, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createFenceGateHitboxes(fenceGate.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      fenceGate.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(fenceGate.id, new HealthComponent(5));
   StatusEffectComponentArray.addComponent(fenceGate.id, new StatusEffectComponent(StatusEffect.poisoned));
   StructureComponentArray.addComponent(fenceGate.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(fenceGate.id, new TribeComponent(tribe));
   FenceGateComponentArray.addComponent(fenceGate.id, new FenceGateComponent());
   
   return fenceGate;
}