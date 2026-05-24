import { HitboxCollisionType, HitboxFlag, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TukmokSpurComponent } from "../../components/TukmokSpurComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createTukmokSpurConfig(x: number, y: number, angle: number, offsetX: number, offsetY: number, mass: number, hitboxFlag: HitboxFlag, isFlipped: boolean): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, offsetX, offsetY, angle, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [hitboxFlag]);
   hitbox.box.flipX = isFlipped;
   // @Hack
   hitbox.box.totalFlipXMultiplier = isFlipped ? -1 : 1;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(25);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const tukmokSpurComponent = new TukmokSpurComponent();
   
   return {
      entityType: EntityType.tukmokSpur,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         tukmokSpurComponent
      ],
      lights: []
   };
}