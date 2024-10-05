import { EntityType } from "battletribes-shared/entities";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { createWorkbenchHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { StructureComponent } from "../../components/StructureComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { CraftingStationComponent } from "../../components/CraftingStationComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.craftingStation;

export function createWorkbenchConfig(tribe: Tribe, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createWorkbenchHitboxes(), null);
   
   const healthComponent = new HealthComponent(15);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connectionInfo);

   const tribeComponent = new TribeComponent(tribe);
   
   const craftingStationComponent = new CraftingStationComponent(CraftingStation.workbench);
   
   return {
      entityType: EntityType.workbench,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.craftingStation]: craftingStationComponent
      }
   };
}