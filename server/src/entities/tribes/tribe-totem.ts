import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray, TotemBannerComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { TotemBannerPosition } from "../../components/TotemBannerComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";

const HITBOX_SIZE = 120;

const NUM_TOTEM_POSITIONS = [4, 6, 8];

const TRIBE_TOTEM_POSITIONS = new Array<TotemBannerPosition>();
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

export function createTribeTotemHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   hitboxes.push(new CircularHitbox(parentX, parentY, 2.2, 0, 0, HitboxCollisionType.hard, HITBOX_SIZE / 2, localID, parentRotation));
   return hitboxes;
}

export function createTribeTotem(position: Point, rotation: number, tribe: Tribe): Entity {
   const totem = new Entity(position, rotation, EntityType.tribeTotem, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   
   const hitboxes = createTribeTotemHitboxes(totem.position.x, totem.position.y, totem.getNextHitboxLocalID(), totem.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      totem.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(totem.id, new HealthComponent(50));
   StatusEffectComponentArray.addComponent(totem.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(totem.id, new TribeComponent(tribe));
   TotemBannerComponentArray.addComponent(totem.id, {
      banners: {},
      // @Speed: Garbage collection
      availableBannerPositions: Array.from(new Set(TRIBE_TOTEM_POSITIONS))
   });

   return totem;
}