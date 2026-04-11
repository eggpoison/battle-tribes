import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point, randInt } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { DesertBushSandyComponent } from "../../components/DesertBushSandyComponent";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createDesertBushSandyConfig(position: Point, angle: number): EntityConfig {
   const size = randInt(0, 1);
   
   const transformComponent = new TransformComponent();

   const radius = size === 0 ? 32 : 40;
   const mass = size === 0 ? 1.2 : 1.6;
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(size === 0 ? 3 : 5);
      
   const energyStoreComponent = new EnergyStoreComponent(150);

   const desertBushSandyComponent = new DesertBushSandyComponent(size);
   
   return {
      entityType: EntityType.desertBushSandy,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         energyStoreComponent,
         desertBushSandyComponent
      ],
      lights: []
   };
}