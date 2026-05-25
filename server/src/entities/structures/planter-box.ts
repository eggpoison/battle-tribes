import { EntityType, StatusEffect, HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, createRectangularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import Tribe from "../../Tribe.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { PlanterBoxComponent } from "../../components/PlanterBoxComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

export function createPlanterBoxConfig(x: number, y: number, angle: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = createRectangularBox(x, y, 0, 0, angle, 80, 80);
   const hitbox = createHitbox(transformComponent, null, box, 1.5, HitboxCollisionType.hard, CollisionBit.planterBox, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(15);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const planterBoxComponent = new PlanterBoxComponent();
   
   return {
      entityType: EntityType.planterBox,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         planterBoxComponent
      ],
      lights: []
   };
}