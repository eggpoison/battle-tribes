import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { PricklyPearFragmentProjectileComponent } from "../../components/PricklyPearFragmentComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createPricklyPearFragmentProjectileConfig(position: Point, angle: number, parentCactus: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 10), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const pricklyPearFragmentProjectileComponent = new PricklyPearFragmentProjectileComponent(parentCactus);
   
   return {
      entityType: EntityType.pricklyPearFragmentProjectile,
      components: [
         transformComponent,
         statusEffectComponent,
         pricklyPearFragmentProjectileComponent
      ],
      lights: []
   };
}