import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../../components";
import { CraftingStationComponent } from "../../../components/CraftingStationComponent";
import { HealthComponent } from "../../../components/HealthComponent";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent";
import { StructureComponent } from "../../../components/StructureComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../../components/TransformComponent";
import { TribeComponent } from "../../../components/TribeComponent";
import Tribe from "../../../Tribe";
import { VirtualStructure } from "../../../tribesman-ai/building-plans/TribeBuildingLayer";
import { MithrilAnvilComponent } from "../../../components/MithrilAnvilComponent";
import { Point } from "../../../../../shared/src/utils";
import { HitboxCollisionType, HitboxFlag } from "../../../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../../shared/src/collision";
import { Hitbox } from "../../../hitboxes";
import { StructureConnection } from "../../../structure-placement";

export function createMithrilAnvilConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   // Middle box
   {
      const box = new RectangularBox(position, new Point(-16, 0), rotation, 48, 56);
      const hitbox = new Hitbox(transformComponent, null, true, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
      hitbox.isStatic = true;
      addHitboxToTransformComponent(transformComponent, hitbox);
   }

   // Left box
   {
      const box = new RectangularBox(position, new Point(-48, 0), rotation, 16, 40);
      const hitbox = new Hitbox(transformComponent, null, true, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
      hitbox.isStatic = true;
      addHitboxToTransformComponent(transformComponent, hitbox);
   }

   // Right box
   {
      const box = new RectangularBox(position, new Point(30, 0), rotation, 44, 40);
      const hitbox = new Hitbox(transformComponent, null, true, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
      hitbox.isStatic = true;
      addHitboxToTransformComponent(transformComponent, hitbox);
   }

   const healthComponent = new HealthComponent(50);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned | StatusEffect.freezing);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const craftingStationComponent = new CraftingStationComponent();
   
   const mithrilAnvilComponent = new MithrilAnvilComponent();
   
   return {
      entityType: EntityType.mithrilAnvil,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         craftingStationComponent,
         mithrilAnvilComponent,
      ],
      lights: []
   };
}