import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { EntityConfig, LightCreationInfo } from "../../components";
import { GuardianSpikyBallComponent } from "../../components/GuardianSpikyBallComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";
import { createLight } from "../../lights";

export function createGuardianSpikyBallConfig(position: Point, rotation: number,creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByAirFriction = false;
   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 20), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned | StatusEffect.poisoned);
   
   const healthComponent = new HealthComponent(8);
   
   const projectileComponent = new ProjectileComponent(creator);
   
   const guardianSpikyBallComponent = new GuardianSpikyBallComponent();
   
   const lights = new Array<LightCreationInfo>();
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