import { EntityConfig, LightCreationInfo } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import Tribe from "../../Tribe.js";
import { SlurbTorchComponent } from "../../components/SlurbTorchComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { createLight } from "../../lights.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { Point } from "../../../../shared/dist/utils.js";

export function createSlurbTorchConfig(x: number, y: number, rotation: number, tribe: Tribe, connections: StructureConnection[], virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = createCircularBox(x, y, 0, 0, rotation, 10);
   const hitbox = createHitbox(transformComponent, null, box, 0.55, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(3);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const slurbTorchComponent = new SlurbTorchComponent();

   const light = createLight(new Point(0, 0), 0.8, 2, 10, 1, 0.4, 1);
   const lightCreationInfo: LightCreationInfo = {
      light: light,
      attachedHitbox: hitbox
   };
   
   return {
      entityType: EntityType.slurbTorch,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         slurbTorchComponent
      ],
      lights: [lightCreationInfo]
   };
}