import { BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { createTunnelHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import Tribe from "../../Tribe";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import { TunnelComponent } from "../../components/TunnelComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.buildingMaterial
   | ServerComponentType.tunnel;

const HEALTHS = [25, 75];

export function createTunnelConfig(tribe: Tribe, material: BuildingMaterial, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createTunnelHitboxes(), null);
   
   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);

   const structureComponent = new StructureComponent(connectionInfo);

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
      }
   };
}