import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { createItemsOverEntity } from "../../entity-shared";
import { registerAttackingEntity } from "../../ai/escape-ai";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";

export const enum CowVars {
   VISION_RANGE = 256,
   MIN_GRAZE_COOLDOWN = 30 * Settings.TPS,
   MAX_GRAZE_COOLDOWN = 60 * Settings.TPS,
   MAX_HEALTH = 10,
   MIN_FOLLOW_COOLDOWN = 15 * Settings.TPS,
   MAX_FOLLOW_COOLDOWN = 30 * Settings.TPS
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.wanderAI
   | ServerComponentType.escapeAI
   | ServerComponentType.followAI
   | ServerComponentType.cow;


const FOLLOW_CHANCE_PER_SECOND = 0.2;

export const COW_GRAZE_TIME_TICKS = 5 * Settings.TPS;

export function createCowConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.cow,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new RectangularHitbox(1.2, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 50, 100, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: CowVars.MAX_HEALTH
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: CowVars.VISION_RANGE
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.escapeAI]: {},
      [ServerComponentType.followAI]: {
         followCooldownTicks: randInt(CowVars.MIN_FOLLOW_COOLDOWN, CowVars.MAX_FOLLOW_COOLDOWN),
         followChancePerSecond: FOLLOW_CHANCE_PER_SECOND,
         followDistance: 60
      },
      [ServerComponentType.cow]: {
         species: randInt(0, 1),
         grazeCooldownTicks: randInt(CowVars.MIN_GRAZE_COOLDOWN, CowVars.MAX_GRAZE_COOLDOWN)
      }
   };
}

export function onCowHurt(cow: EntityID, attackingEntity: EntityID): void {
   registerAttackingEntity(cow, attackingEntity);
}

export function onCowDeath(cow: EntityID): void {
   createItemsOverEntity(cow, ItemType.raw_beef, randInt(2, 3), 40);
   createItemsOverEntity(cow, ItemType.leather, randInt(1, 2), 40);
}