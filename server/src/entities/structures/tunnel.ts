import { BuildingMaterial, EntityType, StatusEffect, Point, RectangularBox, HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import Tribe from "../../Tribe.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent.js";
import { TunnelComponent } from "../../components/TunnelComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

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
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         materialComponent,
         tunnelComponent
      ],
      lights: []
   };
}