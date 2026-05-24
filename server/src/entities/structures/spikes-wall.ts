import { HitboxCollisionType, HitboxFlag, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, BuildingMaterial, EntityType, StatusEffect, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { SpikesComponent } from "../../components/SpikesComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import Tribe from "../../Tribe.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";

// @HACK @MEMORY: COPYNPASTE BETWEEN FLOOR AND WALLS
const HEALTHS = [15, 45];

export function createWallSpikesConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = new RectangularBox(x, y, 0, 0, angle, 56, 28);
   const hitbox = new Hitbox(transformComponent, null, true, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);
   
   const spikesComponent = new SpikesComponent();
   
   return {
      entityType: EntityType.wallSpikes,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         buildingMaterialComponent,
         spikesComponent
      ],
      lights: []
   };
}