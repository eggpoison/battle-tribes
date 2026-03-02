import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { FenceComponent } from "../../components/FenceComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { StructureConnection } from "../../structure-placement";

export function createFenceConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = new RectangularBox(position, new Point(0, 0), rotation, 20, 20);
   const hitbox = new Hitbox(transformComponent, null, true, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);

   const fenceComponent = new FenceComponent();
   
   return {
      entityType: EntityType.fence,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.fence]: fenceComponent
      },
      lights: []
   };
}