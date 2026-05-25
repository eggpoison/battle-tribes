import { EntityType, StatusEffect, CollisionBit, DEFAULT_COLLISION_MASK, HitboxCollisionType, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import Tribe from "../../Tribe.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { HealingTotemComponent } from "../../components/HealingTotemComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { AIHelperComponent } from "../../components/AIHelperComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createHealingTotemConfig(x: number, y: number, angle: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = createCircularBox(x, y, 0, 0, angle, 48);
   const hitbox = createHitbox(transformComponent, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(50);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);

   const tribeComponent = new TribeComponent(tribe);

   const aiHelperComponent = new AIHelperComponent(transformComponent.hitboxes[0], 270, moveFunc, turnFunc);
   
   const healingTotemComponent = new HealingTotemComponent();
   
   return {
      entityType: EntityType.healingTotem,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         aiHelperComponent,
         healingTotemComponent
      ],
      lights: []
   };
}