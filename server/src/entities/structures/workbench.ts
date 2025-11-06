import { EntityType } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { CraftingStationComponent } from "../../components/CraftingStationComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { Hitbox } from "../../hitboxes";
import { StructureConnection } from "../../structure-placement";

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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.craftingStation]: craftingStationComponent
      },
      lights: []
   };
}