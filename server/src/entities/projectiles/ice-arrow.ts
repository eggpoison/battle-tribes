import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { ComponentConfig } from "../../components";
import { ServerComponentType } from "battletribes-shared/components";
import { HealthComponentArray } from "../../components/HealthComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity } from "../../world";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.tribe
   | ServerComponentType.projectile
   | ServerComponentType.iceArrow;

const ARROW_WIDTH = 5 * 4;
const ARROW_HEIGHT = 14 * 4;

export function createIceArrowConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.iceArrow,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), ARROW_WIDTH, ARROW_HEIGHT, 0), 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByAirFriction: true,
         isAffectedByGroundFriction: false,
         isImmovable: true
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.projectile]: {
         owner: 0
      },
      [ServerComponentType.iceArrow]: {}
   };
}

export function onIceArrowCollision(arrow: EntityID, collidingEntity: EntityID): void {
   // Don't damage any friendly entities
   if (getEntityRelationship(arrow, collidingEntity) === EntityRelationship.friendly) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
         applyStatusEffect(collidingEntity, StatusEffect.freezing, 3 * Settings.TPS);
      }
      
      destroyEntity(arrow);
   }
}