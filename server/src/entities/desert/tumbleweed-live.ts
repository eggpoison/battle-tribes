import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TumbleweedLiveComponent } from "../../components/TumbleweedLiveComponent";
import { Hitbox } from "../../hitboxes";

export function createTumbleweedLiveConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 40), 1.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(2);
   
   const tumbleweedLiveComponent = new TumbleweedLiveComponent();
   
   return {
      entityType: EntityType.tumbleweedLive,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.tumbleweedLive]: tumbleweedLiveComponent
      },
      lights: []
   };
}