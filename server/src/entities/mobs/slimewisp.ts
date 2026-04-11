import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import WanderAI from "../../ai/WanderAI";
import { Biome } from "battletribes-shared/biomes";
import Layer from "../../Layer";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { SlimewispComponent } from "../../components/SlimewispComponent";
import { Hitbox } from "../../hitboxes";
import { accelerateEntityToPosition, turnToPosition } from "../../ai-shared";

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return layer.getBiomeAtPosition(x, y) === Biome.swamp;
}

const moveFunc = (slimewisp: Entity, pos: Point, acceleration: number): void => {
   accelerateEntityToPosition(slimewisp, pos, acceleration);
}

const turnFunc = (slimewisp: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(slimewisp, pos, turnSpeed, turnDamping);
}

export function createSlimewispConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 16), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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