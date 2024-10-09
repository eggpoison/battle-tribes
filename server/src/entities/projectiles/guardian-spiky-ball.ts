import { createHitbox, HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { CollisionGroup } from "../../../../shared/src/collision-groups";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID, EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { GuardianSpikyBallComponent } from "../../components/GuardianSpikyBallComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.statusEffect
   | ServerComponentType.health
   | ServerComponentType.projectile
   | ServerComponentType.guardianSpikyBall;

export function createGuardianSpikyBallConfig(creator: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 20), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByAirFriction = false;
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = true;
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned | StatusEffect.poisoned);
   
   const healthComponent = new HealthComponent(8);
   
   const projectileComponent = new ProjectileComponent(creator);
   
   const guardianSpikyBallComponent = new GuardianSpikyBallComponent();
   
   return {
      entityType: EntityType.guardianSpikyBall,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.projectile]: projectileComponent,
         [ServerComponentType.guardianSpikyBall]: guardianSpikyBallComponent
      }
   };
}