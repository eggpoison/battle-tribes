import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { HealthComponentArray } from "../../components/HealthComponent";
import { FishComponentArray } from "../../components/FishComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { registerAttackingEntity } from "../../ai/escape-ai";
import { TribeMemberComponentArray } from "../../components/TribeMemberComponent";
import { ItemType } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";

export const enum FishVars {
   VISION_RANGE = 200
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.wanderAI
   | ServerComponentType.escapeAI
   | ServerComponentType.aiHelper
   | ServerComponentType.fish;

const FISH_WIDTH = 7 * 4;
const FISH_HEIGHT = 14 * 4;

export function createFishConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.fish,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), FISH_WIDTH, FISH_HEIGHT, 0), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 5
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.escapeAI]: {},
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: FishVars.VISION_RANGE
      },
      [ServerComponentType.fish]: {
         colour: randInt(0, 3)
      }
   };
}

// @Cleanup: shouldn't be exported
export function unfollowLeader(fish: EntityID, leader: EntityID): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(leader);
   const idx = tribeMemberComponent.fishFollowerIDs.indexOf(fish);
   if (idx !== -1) {
      tribeMemberComponent.fishFollowerIDs.splice(idx, 1);
   }
}

export function onFishLeaderHurt(fish: EntityID, attackingEntity: EntityID): void {
   if (HealthComponentArray.hasComponent(attackingEntity)) {
      const fishComponent = FishComponentArray.getComponent(fish);
      fishComponent.attackTargetID = attackingEntity;
   }
}

export function onFishHurt(fish: EntityID, attackingEntity: EntityID): void {
   registerAttackingEntity(fish, attackingEntity);
}

export function onFishDeath(fish: EntityID): void {
   createItemsOverEntity(fish, ItemType.raw_fish, 1, 40);
}