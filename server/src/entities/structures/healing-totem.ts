import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealingTotemComponentArray, HealthComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponentArray, StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TribeComponent } from "../../components/TribeComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { HealingTotemComponent } from "../../components/HealingTotemComponent";
import { StructureComponentArray, StructureComponent, StructureInfo } from "../../components/StructureComponent";

const SIZE = 96 - 0.05;

export function createHealingTotemHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<RectangularHitbox | CircularHitbox> {
   const hitboxes = new Array<RectangularHitbox | CircularHitbox>();
   hitboxes.push(new CircularHitbox(parentPosition, 1, 0, 0, HitboxCollisionType.hard, SIZE / 2, localID, parentRotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createHealingTotem(position: Point, rotation: number, tribe: Tribe, structureInfo: StructureInfo): Entity {
   const healingTotem = new Entity(position, rotation, EntityType.healingTotem, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createHealingTotemHitboxes(position, healingTotem.getNextHitboxLocalID(), healingTotem.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      healingTotem.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(healingTotem.id, new HealthComponent(50));
   StatusEffectComponentArray.addComponent(healingTotem.id, new StatusEffectComponent(StatusEffect.bleeding));
   StructureComponentArray.addComponent(healingTotem.id, new StructureComponent(structureInfo));
   TribeComponentArray.addComponent(healingTotem.id, new TribeComponent(tribe));
   HealingTotemComponentArray.addComponent(healingTotem.id, new HealingTotemComponent());
   
   return healingTotem;
}