import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { TotemBannerComponent, TotemBannerComponentArray, TotemBannerPosition } from "../../components/TotemBannerComponent";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox, CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

const HITBOX_SIZE = 120;

const NUM_TOTEM_POSITIONS = [4, 6, 8];

export const TRIBE_TOTEM_POSITIONS = new Array<TotemBannerPosition>();
for (let layerIdx = 0; layerIdx < 3; layerIdx++) {
   const numPositions = NUM_TOTEM_POSITIONS[layerIdx];
   for (let j = 0; j < numPositions; j++) {
      const angle = j / numPositions * 2 * Math.PI;
      TRIBE_TOTEM_POSITIONS.push({
         layer: layerIdx,
         direction: angle
      });
   }
}

export function createTribeTotemHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(2.2, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE / 2));
   return hitboxes;
}

export function createTribeTotem(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const totem = new Entity(position, rotation, EntityType.tribeTotem, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   
   const hitboxes = createTribeTotemHitboxes(totem.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      totem.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(totem.id, new HealthComponent(50));
   StatusEffectComponentArray.addComponent(totem.id, new StatusEffectComponent(StatusEffect.poisoned));
   StructureComponentArray.addComponent(totem.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(totem.id, new TribeComponent(tribe));
   TotemBannerComponentArray.addComponent(totem.id, new TotemBannerComponent());

   return totem;
}