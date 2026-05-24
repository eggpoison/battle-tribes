import { HitboxCollisionType, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { GuardianGemFragmentProjectileComponent } from "../../components/GuardianGemFragmentProjectileComponent.js";
import { ProjectileComponent } from "../../components/ProjectileComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createGuardianGemFragmentProjectileConfig(x: number, y: number, angle: number, creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByAirFriction = false;
   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(x, y, 0, 0, angle, 8, 16), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   
   const projectileComponent = new ProjectileComponent(creator);
   
   const guardianGemFragmentProjectileComponent = new GuardianGemFragmentProjectileComponent();
   
   return {
      entityType: EntityType.guardianGemFragmentProjectile,
      components: [
         transformComponent,
         projectileComponent,
         guardianGemFragmentProjectileComponent
      ],
      lights: []
   };
}