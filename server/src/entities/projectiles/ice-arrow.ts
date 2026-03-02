import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityRelationship, getEntityRelationship, TribeComponent } from "../../components/TribeComponent";
import { EntityConfig } from "../../components";
import { ServerComponentType } from "battletribes-shared/components";
import { HealthComponentArray } from "../../components/HealthComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity } from "../../world";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import Tribe from "../../Tribe";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { IceArrowComponent } from "../../components/IceArrowComponent";
import { Hitbox } from "../../hitboxes";

export function createIceArrowConfig(position: Point, rotation: number, tribe: Tribe, creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 20, 56), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   

   const tribeComponent = new TribeComponent(tribe);
   
   const projectileComponent = new ProjectileComponent(creator);

   const iceArrowComponent = new IceArrowComponent();
   
   return {
      entityType: EntityType.iceArrow,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.projectile]: projectileComponent,
         [ServerComponentType.iceArrow]: iceArrowComponent
      },
      lights: []
   };
}

export function onIceArrowCollision(arrow: Entity, collidingEntity: Entity): void {
   // Don't damage any friendly entities
   if (getEntityRelationship(arrow, collidingEntity) === EntityRelationship.friendly) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
         applyStatusEffect(collidingEntity, StatusEffect.freezing, 3 * Settings.TICK_RATE);
      }
      
      destroyEntity(arrow);
   }
}