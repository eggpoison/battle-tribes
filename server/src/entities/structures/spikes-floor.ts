import { BuildingMaterial, ServerComponentType, Entity, EntityType, DamageSource, StatusEffect, Point, AttackEffectiveness, RectangularBox, HitboxCollisionType, HitboxFlag, CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared";
import { HealthComponent } from "../../components/HealthComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { SpikesComponent } from "../../components/SpikesComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import Tribe from "../../Tribe.js";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

// @HACK @MEMORY: COPYNPASTE BETWEEN FLOOR AND WALLS
const HEALTHS = [15, 45];

export function createFloorSpikesConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = new RectangularBox(position, new Point(0, 0), rotation, 48, 48);
   const hitbox = new Hitbox(transformComponent, null, true, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);
   
   const spikesComponent = new SpikesComponent();
   
   return {
      entityType: EntityType.floorSpikes,
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