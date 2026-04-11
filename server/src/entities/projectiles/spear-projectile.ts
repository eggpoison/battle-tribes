import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent";
import { ThrowingProjectileComponent, ThrowingProjectileComponentArray } from "../../components/ThrowingProjectileComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity, entityExists } from "../../world";
import { SpearProjectileComponent } from "../../components/SpearProjectileComponent";
import { Hitbox } from "../../hitboxes";

export function createSpearProjectileConfig(position: Point, rotation: number, tribeMember: Entity, itemID: number | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 12, 60), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const throwingProjectileComponent = new ThrowingProjectileComponent(tribeMember, itemID);
   
   const spearProjectileComponent = new SpearProjectileComponent();
   
   return {
      entityType: EntityType.spearProjectile,
      components: [
         transformComponent,
         throwingProjectileComponent,
         spearProjectileComponent
      ],
      lights: []
   };
}