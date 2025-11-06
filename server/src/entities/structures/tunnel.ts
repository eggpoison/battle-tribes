import { BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import Tribe from "../../Tribe";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import { TunnelComponent } from "../../components/TunnelComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { StructureConnection } from "../../structure-placement";

const HEALTHS = [25, 75];

export function createTunnelConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const HITBOX_WIDTH = 8;
   const HITBOX_HEIGHT = 64;
   const THIN_HITBOX_WIDTH = 0.1;
   
   // Soft hitboxes
   const soft1 = new Hitbox(transformComponent, null, true, new RectangularBox(position.copy(), new Point(-32 + HITBOX_WIDTH / 2, 0), rotation, HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   soft1.isStatic = true;
   addHitboxToTransformComponent(transformComponent, soft1);
   const soft2 = new Hitbox(transformComponent, null, true, new RectangularBox(position.copy(), new Point(32 - HITBOX_WIDTH / 2, 0), rotation, HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   soft2.isStatic = true;
   addHitboxToTransformComponent(transformComponent, soft2);

   // Hard hitboxes
   const hard1 = new Hitbox(transformComponent, null, true, new RectangularBox(position.copy(), new Point(-32.5 + THIN_HITBOX_WIDTH, 0), rotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hard1.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hard1);
   const hard2 = new Hitbox(transformComponent, null, true, new RectangularBox(position.copy(), new Point(32.5 - THIN_HITBOX_WIDTH, 0), rotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hard2.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hard2);

   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);

   const structureComponent = new StructureComponent(connections, virtualStructure);

   const tribeComponent = new TribeComponent(tribe);

   const materialComponent = new BuildingMaterialComponent(material, HEALTHS);
   
   const tunnelComponent = new TunnelComponent();
   
   return {
      entityType: EntityType.tunnel,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.buildingMaterial]: materialComponent,
         [ServerComponentType.tunnel]: tunnelComponent
      },
      lights: []
   };
}