import { BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { createDoorHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import { TransformComponent } from "../../components/TransformComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import { DoorComponent } from "../../components/DoorComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.buildingMaterial
   | ServerComponentType.door;

const HEALTHS = [15, 45];

export function createDoorConfig(tribe: Tribe, material: BuildingMaterial, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createDoorHitboxes(), null);
   
   // @Hack: Shouldn't need!
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByAirFriction = false;
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = true;

   const healthComponent = new HealthComponent(HEALTHS[material]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connectionInfo);
   
   const tribeComponent = new TribeComponent(tribe);

   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);

   const doorComponent = new DoorComponent();
   
   return {
      entityType: EntityType.door,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.buildingMaterial]: buildingMaterialComponent,
         [ServerComponentType.door]: doorComponent
      }
   };
}