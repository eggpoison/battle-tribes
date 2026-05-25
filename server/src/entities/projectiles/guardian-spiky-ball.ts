import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, Point, StatusEffect, createCircularBox } from "battletribes-shared";
import { EntityConfig, LightCreationInfo } from "../../components.js";
import { GuardianSpikyBallComponent } from "../../components/GuardianSpikyBallComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { ProjectileComponent } from "../../components/ProjectileComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { createLight } from "../../lights.js";

export function createGuardianSpikyBallConfig(x: number, y: number, angle: number,creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByAirFriction = false;
   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 20), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned | StatusEffect.poisoned);
   
   const healthComponent = new HealthComponent(8);
   
   const projectileComponent = new ProjectileComponent(creator);
   
   const guardianSpikyBallComponent = new GuardianSpikyBallComponent();
   
   const lights: Array<LightCreationInfo> = [];
   const light = createLight(new Point(0, 0), 0.4, 0.3, 20, 0.9, 0.2, 0.9);
   lights.push({
      light: light,
      attachedHitbox: hitbox
   });
   
   return {
      entityType: EntityType.guardianSpikyBall,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         projectileComponent,
         guardianSpikyBallComponent
      ],
      lights: lights
   };
}