import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { PebblumComponent } from "../../components/PebblumComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { Hitbox } from "../../hitboxes";

export function createPebblumConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   // Body
   const bodyHitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, -4), rotation, 10 * 2), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
   // Nose
   const noseHitbox = new Hitbox(transformComponent, bodyHitbox, true, new CircularBox(new Point(0, 0), new Point(0, 6), 0, 8 * 2), 0.3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, noseHitbox);
   
   const healthComponent = new HealthComponent(20);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned);
   
   // @Incomplete?
   const pebblumComponent = new PebblumComponent(0);
   
   return {
      entityType: EntityType.pebblum,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.pebblum]: pebblumComponent
      },
      lights: []
   };
}