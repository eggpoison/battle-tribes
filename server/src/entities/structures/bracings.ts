import { HitboxCollisionType, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, BuildingMaterial, EntityType, Settings, StatusEffect, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { BracingsComponent } from "../../components/BracingsComponent.js";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { Hitbox } from "../../hitboxes.js";
import Tribe from "../../Tribe.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";

// @Memory
const HEALTHS = [5, 20]; 

export function createBracingsConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox1 = new Hitbox(transformComponent, null, true, new RectangularBox(x, y, 0, Settings.TILE_SIZE * -0.5, angle, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [])
   hitbox1.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox1);

   const hitbox2 = new Hitbox(transformComponent, null, true, new RectangularBox(x, y, 0, Settings.TILE_SIZE * 0.5, angle, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [])
   hitbox2.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox2);
   
   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent([], virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);

   const bracingsComponent = new BracingsComponent();
   
   return {
      entityType: EntityType.bracings,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         buildingMaterialComponent,
         bracingsComponent
      ],
      lights: []
   };
}