import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { PricklyPearComponent } from "../../components/PricklyPearComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createPricklyPearConfig(position: Point, offset: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, offset, angle, 10), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const healthComponent = new HealthComponent(2);

   const energyStoreComponent = new EnergyStoreComponent(50);

   const pricklyPearComponent = new PricklyPearComponent();
   
   return {
      entityType: EntityType.pricklyPear,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.energyStore]: energyStoreComponent,
         [ServerComponentType.pricklyPear]: pricklyPearComponent
      },
      lights: []
   };
}