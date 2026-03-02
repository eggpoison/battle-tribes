import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { Point } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
import { StatusEffect } from "../../../shared/src/status-effects";
import { SpikyBastardComponent } from "../components/SpikyBastardComponent";
import { Hitbox } from "../hitboxes";
   
export function createSpikyBastardConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 16, 32), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const spikyBastardComponent = new SpikyBastardComponent();
   
   return {
      entityType: EntityType.spikyBastard,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.spikyBastard]: spikyBastardComponent
      },
      lights: []
   };
}