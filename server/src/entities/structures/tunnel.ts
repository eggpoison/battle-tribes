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
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { BuildingMaterial } from "../../../../shared/dist/components.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";

const HEALTHS = [25, 75];

export function createTunnelConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial, connections: StructureConnection[], virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const HITBOX_WIDTH = 8;
   const HITBOX_HEIGHT = 64;
   const THIN_HITBOX_WIDTH = 0.1;
   
   // Soft hitboxes
   const soft1 = createHitbox(transformComponent, null, createRectangularBox(x, y, -32 + HITBOX_WIDTH / 2, 0, angle, HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(soft1);
   addHitboxToTransformComponent(transformComponent, soft1);
   const soft2 = createHitbox(transformComponent, null, createRectangularBox(x, y, 32 - HITBOX_WIDTH / 2, 0, angle, HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(soft2);
   addHitboxToTransformComponent(transformComponent, soft2);

   // Hard hitboxes
   const hard1 = createHitbox(transformComponent, null, createRectangularBox(x, y, -32.5 + THIN_HITBOX_WIDTH, 0, angle, THIN_HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hard1);
   addHitboxToTransformComponent(transformComponent, hard1);
   const hard2 = createHitbox(transformComponent, null, createRectangularBox(x, y, 32.5 - THIN_HITBOX_WIDTH, 0, angle, THIN_HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hard2);
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