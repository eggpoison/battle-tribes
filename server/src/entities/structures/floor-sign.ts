import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { FloorSignComponent } from "../../components/FloorSignComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { Hitbox } from "../../hitboxes";
import { StructureConnection } from "../../structure-placement";
import Tribe from "../../Tribe";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";

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