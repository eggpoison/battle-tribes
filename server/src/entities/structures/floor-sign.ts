import { HitboxCollisionType, RectangularBox, DEFAULT_COLLISION_MASK, CollisionBit, EntityType, StatusEffect, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { FloorSignComponent } from "../../components/FloorSignComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import Tribe from "../../Tribe.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";

export function createFloorSignConfig(position: Point, angle: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructrue: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), angle, 56, 40), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const healthComponent = new HealthComponent(5);
   
   const tribeComponent = new TribeComponent(tribe);

   const structureComponent = new StructureComponent(connections, virtualStructrue);
   
   const floorSignComponent = new FloorSignComponent();
   
   return {
      entityType: EntityType.floorSign,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         tribeComponent,
         structureComponent,
         floorSignComponent,
      ],
      lights: []
   };
}