import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { BuildingMaterial, ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { SpikesComponent } from "../../components/SpikesComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { Hitbox } from "../../hitboxes";
import { StructureConnection } from "../../structure-placement";
import Tribe from "../../Tribe";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";

// @HACK @MEMORY: COPYNPASTE BETWEEN FLOOR AND WALLS
const HEALTHS = [15, 45];

export function createWallSpikesConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = new RectangularBox(position, new Point(0, 0), rotation, 56, 28);
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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.buildingMaterial]: buildingMaterialComponent,
         [ServerComponentType.spikes]: spikesComponent
      },
      lights: []
   };
}