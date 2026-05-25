import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, createCircularBox } from "battletribes-shared";
import { getSandBallMass } from "../../ai/SandBallingAI.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { SandBallComponent } from "../../components/SandBallComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox } from "../../hitboxes.js";

export function createSandBallConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 8), getSandBallMass(1), HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(1);
   
   const sandBallComponent = new SandBallComponent();
   
   return {
      entityType: EntityType.sandBall,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         sandBallComponent,
      ],
      lights: []
   };
}