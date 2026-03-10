import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { HutComponent } from "../../components/HutComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { Hitbox } from "../../hitboxes";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { StructureConnection } from "../../structure-placement";

export function createWarriorHutConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new RectangularBox(position, new Point(0, 0), rotation, 104, 104);
   const hitbox = new Hitbox(transformComponent, null, true, box, 2, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(75);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structrureComponent = new StructureComponent(connections, virtualStructure);

   const tribeComponent = new TribeComponent(tribe);

   const hutComponent = new HutComponent();
   
   return {
      entityType: EntityType.warriorHut,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structrureComponent,
         tribeComponent,
         hutComponent
      ],
      lights: []
   };
}