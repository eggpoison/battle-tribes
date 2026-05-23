import { EntityType, StatusEffect, Point, RectangularBox, HitboxCollisionType, HitboxFlag, CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared";
import { EntityConfig } from "../../../components.js";
import { CraftingStationComponent } from "../../../components/CraftingStationComponent.js";
import { HealthComponent } from "../../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../../components/TransformComponent.js";
import { TribeComponent } from "../../../components/TribeComponent.js";
import Tribe from "../../../Tribe.js";
import { VirtualStructure } from "../../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { AutomatonAssemblerComponent } from "../../../components/AutomatonAssemblerComponent.js";
import { Hitbox } from "../../../hitboxes.js";
import { StructureConnection } from "../../../structure-placement.js";

export function createAutomatonAssemblerConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = new RectangularBox(position, new Point(0, 0), rotation, 160, 80);
   const hitbox = new Hitbox(transformComponent, null, true, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(50);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned | StatusEffect.freezing);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const craftingStationComponent = new CraftingStationComponent();
   
   const automatonAssemblerComponent = new AutomatonAssemblerComponent();
   
   return {
      entityType: EntityType.automatonAssembler,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         craftingStationComponent,
         automatonAssemblerComponent,
      ],
      lights: []
   };
}