import { Hitbox } from "../../../../shared/src/boxes/boxes";
import { createBracingHitboxes } from "../../../../shared/src/boxes/entity-hitbox-creation";
import { CollisionGroup } from "../../../../shared/src/collision-groups";
import { BuildingMaterial, ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { createEmptyStructureConnectionInfo } from "../../../../shared/src/structures";
import { EntityConfig } from "../../components";
import { BracingsComponent } from "../../components/BracingsComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
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
   | ServerComponentType.buildingMaterial
   | ServerComponentType.bracings;

const HEALTHS = [5, 20];

export function createBracingsConfig(hitboxes: ReadonlyArray<Hitbox>, tribe: Tribe, material: BuildingMaterial): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   transformComponent.addHitboxes(hitboxes, null);
   
   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(createEmptyStructureConnectionInfo());
   
   const tribeComponent = new TribeComponent(tribe);
   
   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);

   const bracingsComponent = new BracingsComponent();
   
   return {
      entityType: EntityType.bracings,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.buildingMaterial]: buildingMaterialComponent,
         [ServerComponentType.bracings]: bracingsComponent
      }
   };
}