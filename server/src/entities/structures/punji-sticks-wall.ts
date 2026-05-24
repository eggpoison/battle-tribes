import { HitboxCollisionType, HitboxFlag, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { PunjiSticksComponent } from "../../components/PunjiSticksComponent.js";
import { SpikesComponent } from "../../components/SpikesComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import Tribe from "../../Tribe.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";

export function createWallPunjiSticksConfig(x: number, y: number, angle: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new RectangularBox(x, y, 0, 0, angle, 56, 32);
   const hitbox = new Hitbox(transformComponent, null, true, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
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