import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { SandstoneRockComponent } from "../../components/SandstoneRockComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createSandstoneRockConfig(position: Point, angle: number, size: number): EntityConfig {
   const transformComponent = new TransformComponent();

   let radius: number;
   let mass: number;
   let health: number;
   switch (size) {
      case 0: {
         radius = 20;
         mass = 0.75;
         health = 10;
         break;
      }
      case 1: {
         radius = 28;
         mass = 1.25;
         health = 20;
         break;
      }
      case 2: {
         radius = 36;
         mass = 2;
         health = 30;
         break;
      }
      default: throw new Error();
   }
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const healthComponent = new HealthComponent(health);
   
   const sandstoneRockComponent = new SandstoneRockComponent(size);
   
   return {
      entityType: EntityType.sandstoneRock,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.sandstoneRock]: sandstoneRockComponent
      },
      lights: []
   };
}