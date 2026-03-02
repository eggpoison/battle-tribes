import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { EntityConfig, LightCreationInfo } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { FireTorchComponent } from "../../components/FireTorchComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { Hitbox } from "../../hitboxes";
import { StructureConnection } from "../../structure-placement";
import { createLight } from "../../lights";

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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.fireTorch]: fireTorchComponent
      },
      lights: [lightCreationInfo]
   };
}