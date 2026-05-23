import { DEFAULT_COLLISION_MASK, CollisionBit, Entity, EntityType, DamageSource, Point, AttackEffectiveness, HitboxCollisionType, RectangularBox } from "battletribes-shared";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent.js";
import { ThrowingProjectileComponent, ThrowingProjectileComponentArray } from "../../components/ThrowingProjectileComponent.js";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent.js";
import { destroyEntity, entityExists } from "../../world.js";
import { SpearProjectileComponent } from "../../components/SpearProjectileComponent.js";
import { Hitbox } from "../../hitboxes.js";

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