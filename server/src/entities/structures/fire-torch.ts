import { EntityType, StatusEffect, Point, HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared";
import { EntityConfig, LightCreationInfo } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import Tribe from "../../Tribe.js";
import { FireTorchComponent } from "../../components/FireTorchComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import { createLight } from "../../lights.js";

// @Cleanup: shouldn't be globally exported!
export const FIRE_TORCH_RADIUS = 10;

export function createFireTorchConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new CircularBox(position, new Point(0, 0), rotation, 10);
   const hitbox = new Hitbox(transformComponent, null, true, box, 0.55, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(3);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const light = createLight(new Point(0, 0), 1, 2, FIRE_TORCH_RADIUS, 1, 0.6, 0.35);
   const lightCreationInfo: LightCreationInfo = {
      light: light,
      attachedHitbox: hitbox
   };
   
   const fireTorchComponent = new FireTorchComponent(light);

   return {
      entityType: EntityType.fireTorch,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         fireTorchComponent
      ],
      lights: [lightCreationInfo]
   };
}