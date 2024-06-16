import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponentArray, StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { HealingTotemComponent, HealingTotemComponentArray } from "../../components/HealingTotemComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox, CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

const SIZE = 96 - 0.05;

export function createHealingTotemHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, SIZE / 2));
   return hitboxes;
}

export function createHealingTotem(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const healingTotem = new Entity(position, rotation, EntityType.healingTotem, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createHealingTotemHitboxes(healingTotem.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      healingTotem.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(healingTotem.id, new HealthComponent(50));
   StatusEffectComponentArray.addComponent(healingTotem.id, new StatusEffectComponent(StatusEffect.bleeding));
   StructureComponentArray.addComponent(healingTotem.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(healingTotem.id, new TribeComponent(tribe));
   HealingTotemComponentArray.addComponent(healingTotem.id, new HealingTotemComponent());
   
   return healingTotem;
}