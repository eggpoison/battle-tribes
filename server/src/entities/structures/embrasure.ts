import { BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { createEmbrasureHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { EntityConfig } from "../../components";
import { destroyEntity, getEntityType } from "../../world";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.buildingMaterial;

const HEALTHS = [15, 45];

export function createEmbrasureConfig(tribe: Tribe, material: BuildingMaterial, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createEmbrasureHitboxes(), null);
   
   const healthComponent = new HealthComponent(HEALTHS[material]);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connectionInfo);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const buildingMaterialComponent = new BuildingMaterialComponent(material, HEALTHS);
   
   return {
      entityType: EntityType.embrasure,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.buildingMaterial]: buildingMaterialComponent
      }
   };
}

export function onEmbrasureCollision(collidingEntity: EntityID, pushedHitboxIdx: number): void {
   if (getEntityType(collidingEntity) === EntityType.woodenArrow) {
      // @Incomplete?
      // const arrowComponent = ProjectileComponentArray.getComponent(collidingEntity.id);
      // if (arrowComponent.ignoreFriendlyBuildings) {
      //    return;
      // }

      if (pushedHitboxIdx <= 1) {
         destroyEntity(collidingEntity);
      }
   }
}