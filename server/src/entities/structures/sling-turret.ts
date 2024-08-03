import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { createEmptyStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createSlingTurretHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { ComponentConfig } from "../../components";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.aiHelper
   | ServerComponentType.turret;

// @Cleanup: A lot of copy and paste from ballista.ts

export const SLING_TURRET_SHOT_COOLDOWN_TICKS = 1.5 * Settings.TPS;
export const SLING_TURRET_RELOAD_TIME_TICKS = Math.floor(0.4 * Settings.TPS);
const VISION_RANGE = 400;

export function createSlingTurretConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.slingTurret,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createSlingTurretHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 25
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding | StatusEffect.poisoned
      },
      [ServerComponentType.structure]: {
         connectionInfo: createEmptyStructureConnectionInfo()
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: VISION_RANGE
      },
      [ServerComponentType.turret]: {
         fireCooldownTicks: SLING_TURRET_SHOT_COOLDOWN_TICKS + SLING_TURRET_RELOAD_TIME_TICKS
      }
   };
}