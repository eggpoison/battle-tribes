import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityRelationship, getEntityRelationship, TribeComponent } from "../../components/TribeComponent";
import { EntityConfig } from "../../components";
import { ServerComponentType } from "battletribes-shared/components";
import { HealthComponentArray } from "../../components/HealthComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity } from "../../world";
import { TransformComponent } from "../../components/TransformComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import Tribe from "../../Tribe";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { IceArrowComponent } from "../../components/IceArrowComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.tribe
   | ServerComponentType.projectile
   | ServerComponentType.iceArrow;

const ARROW_WIDTH = 5 * 4;
const ARROW_HEIGHT = 14 * 4;

export function createIceArrowConfig(tribe: Tribe, creator: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), ARROW_WIDTH, ARROW_HEIGHT, 0), 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = true;

   const tribeComponent = new TribeComponent(tribe);
   
   const projectileComponent = new ProjectileComponent(creator);

   const iceArrowComponent = new IceArrowComponent();
   
   return {
      entityType: EntityType.iceArrow,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.projectile]: projectileComponent,
         [ServerComponentType.iceArrow]: iceArrowComponent
      }
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