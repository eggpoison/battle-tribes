import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { EntityConfig } from "../../components";
import { GuardianGemFragmentProjectileComponent } from "../../components/GuardianGemFragmentProjectileComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createGuardianGemFragmentProjectileConfig(position: Point, rotation: number, creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByAirFriction = false;
   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 8, 16), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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