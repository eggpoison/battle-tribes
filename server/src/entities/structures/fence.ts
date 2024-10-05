import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { createFenceHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { FenceComponent } from "../../components/FenceComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.fence;

export function createFenceConfig(tribe: Tribe, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createFenceHitboxes(), null);
   
   const healthComponent = new HealthComponent(5);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connectionInfo);
   
   const tribeComponent = new TribeComponent(tribe);

   const fenceComponent = new FenceComponent();
   
   return {
      entityType: EntityType.fence,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.fence]: fenceComponent
      }
   };
}