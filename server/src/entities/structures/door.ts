import { BuildingMaterial, EntityType, StatusEffect, Point, HitboxCollisionType, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import Tribe from "../../Tribe.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent.js";
import { DoorComponent } from "../../components/DoorComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

const HEALTHS = [15, 45];

export function createDoorConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   transformComponent.isAffectedByAirFriction = false;
   transformComponent.isAffectedByGroundFriction = false;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 64, 16);
   const hitbox = new Hitbox(transformComponent, null, true, box, 0.5, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(HEALTHS[material]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);

   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);

   const doorComponent = new DoorComponent();
   
   return {
      entityType: EntityType.door,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         buildingMaterialComponent,
         doorComponent
      ],
      lights: []
   };
}