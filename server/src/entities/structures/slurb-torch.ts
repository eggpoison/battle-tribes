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
import { SlurbTorchComponent } from "../../components/SlurbTorchComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { createLight } from "../../lights";
import { Point } from "../../../../shared/src/utils";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { Hitbox } from "../../hitboxes";
import { StructureConnection } from "../../structure-placement";

export function createSlurbTorchConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const box = new CircularBox(position, new Point(0, 0), rotation, 10);
   const hitbox = new Hitbox(transformComponent, null, true, box, 0.55, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.slurbTorch]: slurbTorchComponent
      },
      lights: [lightCreationInfo]
   };
}