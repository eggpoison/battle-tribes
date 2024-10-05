import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { TotemBannerComponent, TotemBannerPosition } from "../../components/TotemBannerComponent";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { createTribeTotemHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import Tribe from "../../Tribe";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.totemBanner;

const NUM_TOTEM_POSITIONS = [4, 6, 8];

export const TRIBE_TOTEM_POSITIONS = new Array<TotemBannerPosition>();
for (let layerIdx = 0; layerIdx < 3; layerIdx++) {
   const numPositions = NUM_TOTEM_POSITIONS[layerIdx];
   for (let j = 0; j < numPositions; j++) {
      const angle = j / numPositions * 2 * Math.PI;
      TRIBE_TOTEM_POSITIONS.push({
         layer: layerIdx,
         direction: angle
      });
   }
}

export function createTribeTotemConfig(tribe: Tribe, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createTribeTotemHitboxes(), null);
   
   const healthComponent = new HealthComponent(50);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connectionInfo);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const totemBannerComponent = new TotemBannerComponent();
   
   return {
      entityType: EntityType.barrel,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.totemBanner]: totemBannerComponent
      }
   };
}