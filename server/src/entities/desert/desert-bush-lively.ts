import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { DesertBushLivelyComponent } from "../../components/DesertBushLivelyComponent";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createDesertBushLivelyConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 24), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(3);
   
   const energyStoreComponent = new EnergyStoreComponent(200);
   
   const desertBushLivelyComponent = new DesertBushLivelyComponent();
   
   return {
      entityType: EntityType.desertBushLively,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.energyStore]: energyStoreComponent,
         [ServerComponentType.desertBushLively]: desertBushLivelyComponent
      },
      lights: []
   };
}