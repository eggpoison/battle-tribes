import { EntityType, StatusEffect, HitboxCollisionType, HitboxFlag, CollisionBit, DEFAULT_COLLISION_MASK, RectangularBox } from "battletribes-shared";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { SpikesComponent } from "../../components/SpikesComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import Tribe from "../../Tribe.js";
import { PunjiSticksComponent } from "../../components/PunjiSticksComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

export function createFloorPunjiSticksConfig(x: number, y: number, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new RectangularBox(x, y, 0, 0, rotation, 48, 48);
   const hitbox = new Hitbox(transformComponent, null, true, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const spikesComponent = new SpikesComponent();
   
   const punjiSticksComponent = new PunjiSticksComponent();
   
   return {
      entityType: EntityType.floorPunjiSticks,
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