import { createHitbox, HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { CollisionGroup } from "../../../../shared/src/collision-groups";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID, EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { GuardianGemFragmentProjectileComponent } from "../../components/GuardianGemFragmentProjectileComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { TransformComponent } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.projectile
   | ServerComponentType.guardianGemFragmentProjectile;

export function createGuardianGemFragmentProjectileConfig(creator: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), 8, 16, 0), 0.3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByAirFriction = false;
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = false;
   
   const projectileComponent = new ProjectileComponent(creator);
   
   const guardianGemFragmentProjectileCompoennt = new GuardianGemFragmentProjectileComponent();
   
   return {
      entityType: EntityType.guardianGemFragmentProjectile,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.projectile]: projectileComponent,
         [ServerComponentType.guardianGemFragmentProjectile]: guardianGemFragmentProjectileCompoennt
      }
   };
}