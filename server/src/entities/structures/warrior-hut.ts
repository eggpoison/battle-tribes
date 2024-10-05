import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { createWarriorHutHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { HutComponent } from "../../components/HutComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.hut;

export function createWarriorHutConfig(tribe: Tribe, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createWarriorHutHitboxes(), null);
   
   const healthComponent = new HealthComponent(75);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structrureComponent = new StructureComponent(connectionInfo);

   const tribeComponent = new TribeComponent(tribe);

   const hutComponent = new HutComponent();
   
   return {
      entityType: EntityType.warriorHut,
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