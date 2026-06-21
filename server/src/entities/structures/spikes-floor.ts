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
import { createHitbox, setHitboxIsNonGrassBlocking, setHitboxIsStatic } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { BuildingMaterial } from "../../../../shared/dist/components.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";

// @HACK @MEMORY: COPYNPASTE BETWEEN FLOOR AND WALLS
const HEALTHS = [15, 45];

export function createFloorSpikesConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial, connections: StructureConnection[], virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = createRectangularBox(x, y, 0, 0, angle, 48, 48);
   const hitbox = createHitbox(transformComponent, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   setHitboxIsNonGrassBlocking(hitbox);
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