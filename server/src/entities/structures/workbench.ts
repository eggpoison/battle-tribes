import { EntityType, StatusEffect, Point, HitboxCollisionType, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import Tribe from "../../Tribe.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { CraftingStationComponent } from "../../components/CraftingStationComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

export function createWorkbenchConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   // @TEMPORARY @HACKK: So that the structure placement works for placing workbenches in the corner of walls
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position.copy(), new Point(0, 0), rotation, 80, 80), 1.6, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   // const hitbox1 = new Hitbox(transformComponent, null, true, new RectangularBox(position.copy(), new Point(0, 0), rotation, 72, 80), 1.6, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   // addHitboxToTransformComponent(transformComponent, hitbox1);
   
   // const hitbox2 = new Hitbox(transformComponent, null, true, new RectangularBox(position.copy(), new Point(0, 0), rotation, 80, 72), 1.6, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   // addHitboxToTransformComponent(transformComponent, hitbox2);

   const healthComponent = new HealthComponent(15);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);

   const tribeComponent = new TribeComponent(tribe);
   
   const craftingStationComponent = new CraftingStationComponent();
   
   return {
      entityType: EntityType.workbench,
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