import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { createWorkerHutHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { HutComponent } from "../../components/HutComponent";
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
   | ServerComponentType.hut;

export function createWorkerHutConfig(tribe: Tribe, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createWorkerHutHitboxes(), null);
   
   const healthComponent = new HealthComponent(50);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structrureComponent = new StructureComponent(connectionInfo);

   const tribeComponent = new TribeComponent(tribe);

   const hutComponent = new HutComponent();
   
   return {
      entityType: EntityType.workerHut,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structrureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.hut]: hutComponent
      }
   };
}