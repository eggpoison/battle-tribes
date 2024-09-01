import { COLLISION_BITS, DEFAULT_COLLISION_MASK, HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { ComponentConfig } from "../../components";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect;

export function createFibrePlantConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.fibrePlant,
         collisionBit: COLLISION_BITS.plants,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 36)]
      },
      [ServerComponentType.health]: {
         maxHealth: 10
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding
      }
   }
}