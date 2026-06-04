import { EntityConfig } from "../../components.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import WanderAI from "../../ai/WanderAI.js";
import Layer from "../../Layer.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { SlimewispComponent } from "../../components/SlimewispComponent.js";
import { createHitbox } from "../../hitboxes.js";
import { accelerateEntityToPosition, turnToPosition } from "../../ai-shared.js";
import { Biome } from "../../../../shared/dist/biomes.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { Entity, EntityType } from "../../../../shared/dist/entities.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return layer.getBiomeAtPosition(x, y) === Biome.swamp;
}

const moveFunc = (slimewisp: Entity, x: number, y: number, acceleration: number): void => {
   accelerateEntityToPosition(slimewisp, x, y, acceleration);
}

const turnFunc = (slimewisp: Entity, x: number, y: number, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(slimewisp, x, y, turnSpeed, turnDamping);
}

export function createSlimewispConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 16), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(3);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const aiHelperComponent = new AIHelperComponent(hitbox, 100, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(100, Math.PI, 1, 99999, positionIsValidCallback);
   
   const slimewispComponent = new SlimewispComponent();
   
   return {
      entityType: EntityType.slimewisp,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         slimewispComponent
      ],
      lights: []
   };
}