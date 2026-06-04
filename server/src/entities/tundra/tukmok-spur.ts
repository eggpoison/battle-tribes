import { HitboxTag, createCircularBox, HitboxCollisionType, setBoxFlipX } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TukmokSpurComponent } from "../../components/TukmokSpurComponent.js";
import { createHitbox, setHitboxTag } from "../../hitboxes.js";

export function createTukmokSpurConfig(x: number, y: number, angle: number, offsetX: number, offsetY: number, mass: number, tag: HitboxTag, isFlipped: boolean): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, offsetX, offsetY, angle, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(hitbox, tag);
   setBoxFlipX(hitbox.box, isFlipped);
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