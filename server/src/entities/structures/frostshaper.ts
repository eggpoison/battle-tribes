import { EntityType, StatusEffect, RectangularBox, HitboxCollisionType, HitboxFlag, CollisionBit, DEFAULT_COLLISION_MASK, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { CraftingStationComponent } from "../../components/CraftingStationComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import Tribe from "../../Tribe.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

export function createFrostshaperConfig(x: number, y: number, angle: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new RectangularBox(x, y, 0, 0, angle, 120, 80);
   const hitbox = new Hitbox(transformComponent, null, true, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(20);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned | StatusEffect.freezing);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const craftingStationComponent = new CraftingStationComponent();
   
   return {
      entityType: EntityType.frostshaper,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         craftingStationComponent
      ],
      lights: []
   };
}