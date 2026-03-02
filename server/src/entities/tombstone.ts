import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { TombstoneComponent } from "../components/TombstoneComponent";
import { Hitbox } from "../hitboxes";

export function createTombstoneConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 48, 88), 1.25, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(50);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const tombstoneComponent = new TombstoneComponent();
   
   return {
      entityType: EntityType.tombstone,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tombstone]: tombstoneComponent
      },
      lights: []
   };
}