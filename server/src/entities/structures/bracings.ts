import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { BuildingMaterial } from "../../../../shared/dist/components.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { EntityConfig } from "../../components.js";
import { BracingsComponent } from "../../components/BracingsComponent.js";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import Tribe from "../../Tribe.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";

// @Memory
const HEALTHS = [5, 20]; 

export function createBracingsConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox1 = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, Settings.TILE_SIZE * -0.5, angle, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK)
   setHitboxIsStatic(hitbox1);
   addHitboxToTransformComponent(transformComponent, hitbox1);

   const hitbox2 = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, Settings.TILE_SIZE * 0.5, angle, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK)
   setHitboxIsStatic(hitbox2);
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