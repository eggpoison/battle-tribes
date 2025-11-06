import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { EntityType, Entity } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, randFloat, randSign } from "battletribes-shared/utils";
import { HealthComponent } from "../components/HealthComponent";
import { SnowballComponent } from "../components/SnowballComponent";
import { EntityConfig } from "../components";
import { ServerComponentType } from "battletribes-shared/components";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { addHitboxAngularVelocity, Hitbox } from "../hitboxes";

const MAX_HEALTHS: ReadonlyArray<number> = [1, 3, 5, 7];

export function createSnowballConfig(position: Point, rotation: number, yeti: Entity, size: number): EntityConfig {
   const transformComponent = new TransformComponent();

   let radius: number;
   switch (size) {
      case 0: radius = 8; break;
      case 1: radius = 14; break;
      case 2: radius = 22; break;
      case 3: radius = 30; break;
      default: throw new Error();
   }
   const mass = radius * radius * 0.003;
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, radius), mass, HitboxCollisionType.soft, CollisionBit.snowball, DEFAULT_COLLISION_MASK, []);
   addHitboxAngularVelocity(hitbox, randFloat(1, 2) * Math.PI * randSign());
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(MAX_HEALTHS[size]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing);
   
   const snowballComponent = new SnowballComponent(yeti, size);
   
   return {
      entityType: EntityType.snowball,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.snowball]: snowballComponent
      },
      lights: []
   };
}