import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { PunjiSticksComponent } from "../../components/PunjiSticksComponent.js";
import { SpikesComponent } from "../../components/SpikesComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { createHitbox, setHitboxIsNonGrassBlocking } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import Tribe from "../../Tribe.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";

export function createWallPunjiSticksConfig(x: number, y: number, angle: number, tribe: Tribe, connections: StructureConnection[], virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = createRectangularBox(x, y, 0, 0, angle, 56, 32);
   const hitbox = createHitbox(transformComponent, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsNonGrassBlocking(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const spikesComponent = new SpikesComponent();
   
   const punjiSticksComponent = new PunjiSticksComponent();
   
   return {
      entityType: EntityType.wallPunjiSticks,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         spikesComponent,
         punjiSticksComponent
      ],
      lights: []
   };
}